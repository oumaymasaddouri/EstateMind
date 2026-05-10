#!/usr/bin/env python3
"""Debug script to inspect CatBoost model structure."""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent / "backend"))

import joblib

# Load the model
model_path = Path(__file__).parent / "backend/valuation/artifacts/models/models_estateprocessor/bytype__appartement__catboost.joblib"
model = joblib.load(model_path)

print("=" * 80)
print("CatBoost Model Structure Analysis")
print("=" * 80)

# Check feature names
if hasattr(model, "feature_names_"):
    print(f"\nFeature names ({len(model.feature_names_)} total):")
    for i, fname in enumerate(model.feature_names_):
        print(f"  [{i:2d}] {fname}")

# Check for cat_features
if hasattr(model, "get_cat_feature_indices"):
    cat_indices = model.get_cat_feature_indices()
    print(f"\nCategorical feature indices:")
    print(f"  {cat_indices}")
    if cat_indices and model.feature_names_:
        print(f"\nCategorical features by name:")
        for idx in cat_indices:
            if idx < len(model.feature_names_):
                print(f"  [{idx}] {model.feature_names_[idx]}")

if hasattr(model, "cat_features_"):
    print(f"\ncat_features_ attribute:")
    print(f"  {model.cat_features_}")

