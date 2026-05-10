#!/usr/bin/env python3
"""Debug script to trace through the feature transformation."""

import sys
from pathlib import Path
import numpy as np
import pandas as pd

sys.path.insert(0, str(Path(__file__).parent / "backend"))

from valuation.inference.model_registry import ModelRegistry

# Load bundle
registry = ModelRegistry()
handle = registry.get_best_handle("appartement")
handle = registry.maybe_load_bundle(handle)
bundle = handle.bundle

# Create mapped request
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

seed_ppm = 1450

# Build request_row
request_row = {
    "transaction_type": str(mapped.get("transaction_type") or "sale"),
    "property_type": str(mapped.get("model_property_type") or mapped["property_type"]),
    "price_tnd": float(mapped["surface_m2"]) * seed_ppm,
    "surface_m2": float(mapped["surface_m2"]),
    "price_per_m2": seed_ppm,
    "rooms": float(mapped.get("rooms") or 0),
    "bedrooms": float(mapped.get("bedrooms", 0)),
    "bathrooms": float(mapped.get("bathrooms", 0)),
    "governorate": str(mapped["governorate"]),
    "city": str(mapped.get("city") or mapped.get("delegation") or ""),
    "latitude": float(mapped["latitude"]) if mapped.get("latitude") is not None else np.nan,
    "longitude": float(mapped["longitude"]) if mapped.get("longitude") is not None else np.nan,
}

print("Request row:")
for k, v in request_row.items():
    print(f"  {k}: {v}")

# Create transformed DataFrame
transformed = pd.DataFrame([request_row])

print(f"\nInitial transformed DataFrame:")
print(transformed)

# Add missing columns
for col in bundle.feature_columns:
    if col not in transformed.columns:
        transformed[col] = np.nan

print(f"\nAfter adding missing columns:")
print(transformed[bundle.feature_columns])

# Create derived features
if "city_governorate" in bundle.feature_columns:
    city_col = transformed["city"].fillna("unknown").astype(str) if "city" in transformed.columns else "unknown"
    gov_col = transformed["governorate"].fillna("unknown").astype(str) if "governorate" in transformed.columns else "unknown"
    transformed["city_governorate"] = city_col + "__" + gov_col
    print(f"\nAfter creating city_governorate:")
    print(f"  city: {transformed['city'].values}")
    print(f"  governorate: {transformed['governorate'].values}")
    print(f"  city_governorate: {transformed['city_governorate'].values}")

# Now apply the conversion
features = transformed[bundle.feature_columns].copy()
print(f"\nFeatures before conversion:")
print(features[['transaction_type', 'property_type', 'city', 'governorate', 'city_governorate']])
print(f"  dtypes: {features[['transaction_type', 'property_type', 'city', 'governorate', 'city_governorate']].dtypes.to_dict()}")

# Get categorical feature indices
cat_feature_indices = []
if hasattr(bundle.estimator, "get_cat_feature_indices"):
    cat_feature_indices = list(bundle.estimator.get_cat_feature_indices())

print(f"\nCategorical feature indices from model: {cat_feature_indices}")
print(f"Categorical features by index:")
for idx in cat_feature_indices:
    if idx < len(bundle.feature_columns):
        col = bundle.feature_columns[idx]
        val = features[col].iloc[0] if col in features.columns else "MISSING"
        print(f"  [{idx}] {col}: {val} (type: {type(val).__name__})")

# Apply conversion
for idx in cat_feature_indices:
    if idx < len(bundle.feature_columns):
        col = bundle.feature_columns[idx]
        if col in features.columns:
            print(f"\nConverting {col} to string...")
            print(f"  Before: {features[col].values} (dtype: {features[col].dtype})")
            features[col] = features[col].astype(str)
            features[col] = features[col].replace("nan", "unknown")
            features[col] = features[col].replace("None", "unknown")
            print(f"  After: {features[col].values} (dtype: {features[col].dtype})")

print(f"\nFinal features:")
print(features[['transaction_type', 'property_type', 'city', 'governorate', 'city_governorate']])
print(f"  dtypes: {features[['transaction_type', 'property_type', 'city', 'governorate', 'city_governorate']].dtypes.to_dict()}")
