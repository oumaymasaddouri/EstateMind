"""Model-backed valuation orchestrator — full ML + climate pipeline."""

import logging

from . import comparables, confidence, explanation, response_builder, scenario_service, shap_service
from . import nlp_service

from ..inference.fallback_model import FallbackTabularModelService
from ..inference.model_registry import ModelRegistry
from ..inference.request_mapper import map_request
from ..inference.cv_model import CVModelService
from ..inference.sentiment_model import SentimentModelService

logger = logging.getLogger(__name__)


def estimate(data: dict, image_files: list | None = None) -> dict:
    """
    End-to-end valuation pipeline.
    data         — validated dict from ValuationInputSerializer.
    image_files  — list of InMemoryUploadedFile objects (may be empty).
    """
    image_files = image_files or []
    mapped = map_request(data)
    registry = ModelRegistry()
    fallback_service = FallbackTabularModelService()
    cv_service = CVModelService()
    sentiment_service = SentimentModelService()

    # 1 ── Price prediction (primary CatBoost bundle)
    handle = registry.get_best_handle(mapped.get("model_property_type", mapped.get("property_type", "")))
    handle = registry.maybe_load_bundle(handle)
    prediction = None
    if handle is not None and handle.bundle_available and handle.bundle is not None:
        try:
            pred = handle.bundle.predict(mapped, {"avg_price_per_m2": 1450})
            prediction = {
                "estimated_price": pred.estimated_price,
                "price_per_m2": pred.price_per_m2,
                "prediction_mode": pred.prediction_mode,
                "warnings": getattr(pred, "warnings", []),
                "uncertainty_reasons": getattr(pred, "uncertainty_reasons", []),
                "model_info": getattr(pred, "model_info", {}),
            }
        except Exception as exc:
            logger.warning("Primary bundle prediction failed: %s", exc)

    # 1b ── Fallback tabular model
    if prediction is None:
        fb = fallback_service.predict(mapped)
        if fb is not None:
            prediction = {
                "estimated_price": fb.estimated_price,
                "price_per_m2": fb.price_per_m2,
                "prediction_mode": fb.prediction_mode,
                "warnings": getattr(fb, "warnings", []),
                "uncertainty_reasons": getattr(fb, "uncertainty_reasons", []),
                "model_info": getattr(fb, "model_info", {}),
            }

    # 1c ── Heuristic fallback (always succeeds)
    if prediction is None:
        from . import heuristic
        heuristic_result = heuristic.estimate(data)
        prediction = {
            "estimated_price": heuristic_result["estimated_price"],
            "price_per_m2": heuristic_result["price_per_m2"],
            "prediction_mode": heuristic_result["prediction_mode"],
            "warnings": heuristic_result.get("warnings", []),
            "uncertainty_reasons": heuristic_result.get("uncertainty_reasons", []),
            "model_info": {},
            "active_amenities": heuristic_result.get("active_amenities", []),
        }

    logger.info(
        "Valuation: gov=%s type=%s size=%s mode=%s price=%s",
        data.get("governorate", ""),
        data.get("property_type", ""),
        data.get("size_m2", ""),
        prediction["prediction_mode"],
        prediction["estimated_price"],
    )

    # 2 ── Image analysis (CV model)
    image_analysis = None
    cv_prediction = None
    if image_files:
        try:
            cv_prediction = cv_service.analyze_images(image_files)
            if cv_prediction:
                image_analysis = {
                    "image_count": len(image_files),
                    "property_type_predicted": cv_prediction.property_type,
                    "quality_score": cv_prediction.image_quality_score,
                    "coverage_score": cv_prediction.coverage_score,
                    "confidence": cv_prediction.confidence,
                    "status": cv_prediction.status,
                    "cv_mode": "vision_enabled",
                    "image_analysis": f"Analyzed {len(image_files)} image(s), predicted property type: {cv_prediction.property_type}",
                    "warnings": cv_prediction.warnings,
                }
        except Exception as exc:
            logger.warning("CV analysis failed: %s", exc)
            image_analysis = {
                "image_count": len(image_files),
                "quality_score": 0.0,
                "coverage_score": 0.0,
                "status": "analysis_failed",
                "cv_mode": "vision_error",
                "image_analysis": "Image analysis failed",
                "warnings": [str(exc)],
            }

    if not image_analysis:
        image_analysis = {
            "image_count": 0,
            "quality_score": 0.0,
            "coverage_score": 0.0,
            "status": "no_images",
            "cv_mode": "not_used",
            "image_analysis": "No images uploaded.",
            "warnings": [],
        }

    # 3 ── Sentiment analysis (TF-IDF model + NLP heuristics)
    text_analysis = None
    try:
        description = data.get("description", "")
        sentiment_prediction = sentiment_service.analyze_description(description)
        if sentiment_prediction:
            location_sentiment = nlp_service.analyze_location(data.get("city", ""), data.get("governorate", ""))
            text_analysis = {
                "description_quality": sentiment_prediction.description_quality,
                "description_sentiment": sentiment_prediction.sentiment_score,
                "description_sentiment_label": sentiment_prediction.sentiment_label,
                "sentiment_score": sentiment_prediction.sentiment_score,
                "sentiment_label": sentiment_prediction.sentiment_label,
                "location_sentiment": location_sentiment,
                "location_sentiment_label": location_sentiment.get("label", "neutral"),
                "marketing_effectiveness": "Evaluated" if description else "Not evaluated",
                "key_phrases": sentiment_prediction.key_phrases,
                "token_count": sentiment_prediction.token_count,
                "description_score": sentiment_prediction.description_score,
                "sentiment_mode": "tfidf_enabled",
                "warnings": sentiment_prediction.warnings,
            }
    except Exception as exc:
        logger.warning("Sentiment analysis failed: %s", exc)

    if not text_analysis:
        location_sentiment = nlp_service.analyze_location(data.get("city", ""), data.get("governorate", ""))
        text_analysis = {
            "description_quality": "Not evaluated",
            "description_sentiment": 0.5,
            "description_sentiment_label": "neutral",
            "sentiment_score": 0.5,
            "sentiment_label": "neutral",
            "location_sentiment": location_sentiment,
            "location_sentiment_label": location_sentiment.get("label", "neutral"),
            "marketing_effectiveness": "Not evaluated",
            "key_phrases": [],
            "token_count": 0,
            "description_score": 0,
            "sentiment_mode": "not_used",
            "warnings": [],
        }

    # 4 ── Comparables + market context
    comps, market_ctx = comparables.find(data, prediction["estimated_price"])

    # 5 ── Price drivers, confidence scoring, and scenarios
    shap_result = shap_service.explain(data, prediction)
    conf_result = confidence.compute(data, prediction, comps, image_files)
    scenarios, recommendations = scenario_service.generate(
        data,
        prediction["estimated_price"],
        comps,
        conf_result,
        text_analysis,
        shap_result.get("features_impact", []),
    )

    # Override bounds
    prediction["lower_bound"] = conf_result["lower_bound"]
    prediction["upper_bound"] = conf_result["upper_bound"]

    # 6 ── Climate risk price adjustment
    gov = data.get("governorate", "")
    climate_info = {}
    if gov:
        try:
            from core.services.climate_intelligence import climate_price_adjustment, compute_risk_score
            _, risk_category = compute_risk_score(gov)
            adj_pct, adj_label = climate_price_adjustment(
                gov,
                property_type=data.get("property_type", "apartment"),
                risk_category=risk_category,
            )
            climate_adj_price = round(prediction["estimated_price"] * (1 + adj_pct / 100))
            climate_info = {
                "climate_risk_category": risk_category,
                "climate_adjustment_pct": adj_pct,
                "climate_adjusted_price": climate_adj_price,
                "climate_label": adj_label,
            }
            logger.info(
                "Climate adjustment for %s: %s%% (%s) → %s TND",
                gov, adj_pct, adj_label, climate_adj_price,
            )
        except Exception as exc:
            logger.warning("Climate adjustment failed for %s: %s", gov, exc)

    # 7 ── AI narrative explanation
    ai_text = explanation.build(
        data,
        prediction,
        conf_result,
        comps,
        market_ctx,
        text_analysis,
        shap_result,
        image_analysis=image_analysis,
    )

    # 8 ── Assemble final response
    result = response_builder.build(
        data, prediction, conf_result, shap_result,
        comps, market_ctx, text_analysis, ai_text,
        image_analysis=image_analysis,
        scenarios=scenarios,
        recommendations=recommendations,
    )
    result.update(climate_info)
    return result
