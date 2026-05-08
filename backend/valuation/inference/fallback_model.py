"""Fallback tabular CatBoost model for property price prediction."""

from __future__ import annotations

import json
import logging
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any

logger = logging.getLogger(__name__)


@dataclass
class FallbackPrediction:
    estimated_price: int
    price_per_m2: int
    prediction_mode: str
    warnings: list[str] = field(default_factory=list)
    uncertainty_reasons: list[str] = field(default_factory=list)
    model_info: dict[str, Any] = field(default_factory=dict)


class FallbackTabularModelService:
    """CatBoost log-price fallback model with city/governorate price priors."""

    def __init__(self, artifacts_dir: str | Path | None = None) -> None:
        root = Path(__file__).resolve().parents[3]
        self.artifacts_dir = Path(artifacts_dir) if artifacts_dir else root / "backend" / "valuation" / "artifacts" / "models" / "fallback_tabular"
        self.manifest_path = self.artifacts_dir / "manifest.json"
        self._manifest: dict | None = None
        self._models: dict[str, Any] = {}

    def _load_manifest(self) -> dict | None:
        if self._manifest is not None:
            return self._manifest
        if not self.manifest_path.exists():
            return None
        try:
            self._manifest = json.loads(self.manifest_path.read_text(encoding="utf-8"))
            return self._manifest
        except Exception as exc:
            logger.warning("Failed to load fallback model manifest: %s", exc)
            return None

    def _load_model(self, property_type: str) -> Any | None:
        if property_type in self._models:
            return self._models[property_type]

        manifest = self._load_manifest()
        if manifest is None:
            return None

        # manifest.models is a dict keyed by "appartement__sale", "maison__sale", etc.
        pt_map = {
            "appartement": "appartement__sale",
            "apartment":   "appartement__sale",
            "maison":      "maison__sale",
            "house":       "maison__sale",
            "terrain":     "terrain__sale",
            "land":        "terrain__sale",
        }
        model_key = pt_map.get(property_type.lower())
        models_dict = manifest.get("models", {})

        model_file = None
        if model_key and isinstance(models_dict, dict):
            entry = models_dict.get(model_key, {})
            model_file = entry.get("artifact")
        elif isinstance(models_dict, list):
            for entry in models_dict:
                if entry.get("property_type", "").lower() == property_type.lower():
                    model_file = entry.get("artifact") or entry.get("path")
                    break

        if model_file is None:
            # Hard-coded fallback filenames
            file_map = {
                "appartement": "appartement__sale__catboost.joblib",
                "apartment":   "appartement__sale__catboost.joblib",
                "maison":      "maison__sale__catboost.joblib",
                "house":       "maison__sale__catboost.joblib",
                "terrain":     "terrain__sale__catboost.joblib",
                "land":        "terrain__sale__catboost.joblib",
            }
            model_file = file_map.get(property_type.lower())

        if model_file is None:
            return None

        path = self.artifacts_dir / model_file
        if not path.exists():
            return None

        try:
            import joblib
            model = joblib.load(path)
            self._models[property_type] = model
            return model
        except Exception as exc:
            logger.warning("Failed to load fallback model %s: %s", path, exc)
            return None

    def _get_model_entry(self, property_type: str) -> dict:
        """Return the manifest entry dict for this property type."""
        manifest = self._load_manifest() or {}
        pt_map = {
            "appartement": "appartement__sale",
            "apartment":   "appartement__sale",
            "maison":      "maison__sale",
            "house":       "maison__sale",
            "terrain":     "terrain__sale",
            "land":        "terrain__sale",
        }
        key = pt_map.get(property_type.lower(), "appartement__sale")
        models_dict = manifest.get("models", {})
        if isinstance(models_dict, dict):
            return models_dict.get(key, {})
        return {}

    def _resolve_price_prior(self, entry: dict, gov: str, city: str) -> float:
        """Look up local median price/m² — prefers CSV engine over manifest priors."""
        # 1. Try data-driven CSV engine first (most reliable)
        try:
            from valuation.services.csv_engine import get_ppm2
            csv_val = get_ppm2(city, gov, "apartment", "sale")
            if csv_val and csv_val >= 500:
                return float(csv_val)
        except Exception:
            pass

        # 2. Fall back to manifest priors, but only if value is realistic (>=200 TND/m²)
        priors = entry.get("priors", {})
        cg_priors = priors.get("city_governorate_price_m2", {})
        gov_priors = priors.get("governorate_price_m2", {})
        global_ppm2 = priors.get("global_price_m2", 1450)

        city_gov_key = f"{city.lower()}__{gov.lower()}" if city and gov else ""
        for key in [city_gov_key, city.lower(), gov.lower()]:
            pool = cg_priors if "__" in key else gov_priors
            val = pool.get(key)
            if val and float(val) >= 200:
                return float(val)

        return float(global_ppm2 or 1450)

    def predict(self, mapped: dict) -> FallbackPrediction | None:
        import numpy as np

        property_type = str(mapped.get("model_property_type") or mapped.get("property_type") or "appartement")
        model = self._load_model(property_type)
        if model is None:
            return None

        entry = self._get_model_entry(property_type)
        size_m2 = float(mapped.get("size_m2") or mapped.get("surface_m2") or 100)
        gov  = str(mapped.get("governorate") or "").strip()
        city = str(mapped.get("city") or mapped.get("delegation") or "").strip()

        local_ppm2 = self._resolve_price_prior(entry, gov, city)
        fill_values = entry.get("fill_values", {})

        try:
            import pandas as pd

            tx_type  = str(mapped.get("transaction_type") or "sale")
            ptype    = str(mapped.get("model_property_type") or mapped.get("property_type") or "appartement")
            gov_str  = gov or "Tunis"
            city_str = city or gov_str

            row = {
                "transaction_type":         tx_type,
                "property_type":            ptype,
                "surface_m2":               size_m2,
                "rooms":                    float(mapped.get("rooms") or mapped.get("bedrooms") or fill_values.get("rooms", 2)) + 1,
                "bedrooms":                 float(mapped.get("bedrooms") or fill_values.get("bedrooms", 2)),
                "bathrooms":                float(mapped.get("bathrooms") or fill_values.get("bathrooms", 1)),
                "governorate":              gov_str,
                "city":                     city_str,
                "latitude":                 float(fill_values.get("latitude", 35.8288)),
                "longitude":                float(fill_values.get("longitude", 10.2639)),
                "city_governorate":         f"{city_str}__{gov_str}",
                "local_avg_price_m2":       local_ppm2,
                "gov_avg_price_m2":         local_ppm2,
                "size_x_local_price":       size_m2 * local_ppm2,
            }

            feature_columns = entry.get("feature_columns") or list(getattr(model, "feature_names_", []) or [])
            if feature_columns:
                frame = pd.DataFrame([{fn: row.get(fn, 0) for fn in feature_columns}])
            else:
                frame = pd.DataFrame([row])

            pred_log = float(model.predict(frame)[0])
            pred_price = int(round(float(np.expm1(pred_log))))
            pred_ppm2 = int(round(pred_price / max(size_m2, 1)))

            return FallbackPrediction(
                estimated_price=max(pred_price, 1),
                price_per_m2=max(pred_ppm2, 1),
                prediction_mode="fallback_model",
                warnings=[],
                uncertainty_reasons=["fallback_tabular_model_used"],
                model_info={
                    "model_type": "catboost_log_price",
                    "property_type": property_type,
                    "local_ppm2_prior": local_ppm2,
                },
            )
        except Exception as exc:
            logger.warning("Fallback model prediction failed: %s", exc)
            return None
