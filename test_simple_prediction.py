#!/usr/bin/env python3
"""Simplified test to debug the bundle prediction issue."""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent / "backend"))

from valuation.inference.model_registry import ModelRegistry
import logging

logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

# Step 1: Load bundle
registry = ModelRegistry()
handle = registry.get_best_handle("appartement")
handle = registry.maybe_load_bundle(handle)

logger.info(f"Bundle loaded: {handle.bundle is not None}")
logger.info(f"Feature columns: {handle.bundle.feature_columns}")

# Step 2: Create a simple mapped request
mapped = {
    "property_type": "appartement",
    "model_property_type": "appartement",
    "transaction_type": "sale",
    "surface_m2": 120.0,
    "bedrooms": 3,
    "bathrooms": 2,
    "rooms": 4,
    "governorate": "Tunis",
    "city": "La Soukra",
    "latitude": 36.8,
    "longitude": 10.2,
}

logger.info(f"\nRequest mapped data:")
for k, v in mapped.items():
    logger.info(f"  {k}: {v}")

# Step 3: Try prediction
cv_signals = {
    "image_count": 2,
    "quality_score": 0.8,
    "coverage_score": 0.7,
    "confidence": 0.85,
}

text_signals = {
    "sentiment_score": 0.75,
    "sentiment_label": "positive",
    "description_quality": "good",
}

try:
    pred = handle.bundle.predict(
        mapped,
        {"avg_price_per_m2": 1450},
        cv_analysis=cv_signals,
        text_analysis=text_signals,
    )
    logger.info(f"\n✓ Prediction successful!")
    logger.info(f"  Price: {pred.estimated_price:,.0f} TND")
    logger.info(f"  Price per m²: {pred.price_per_m2:,.0f} TND")
    logger.info(f"  Mode: {pred.prediction_mode}")
    logger.info(f"  Warnings: {pred.warnings}")
except Exception as e:
    logger.error(f"\n✗ Prediction failed: {e}")
    import traceback
    traceback.print_exc()
