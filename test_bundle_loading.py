#!/usr/bin/env python3
"""Test script to verify CatBoost bundle loading and signal integration."""

import sys
import logging
from pathlib import Path

# Add backend to path
sys.path.insert(0, str(Path(__file__).parent / "backend"))

# Configure logging
logging.basicConfig(
    level=logging.DEBUG,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

def test_bundle_loading():
    """Test that CatBoost bundles are properly discovered and loaded."""
    try:
        from valuation.inference.model_registry import ModelRegistry
        
        logger.info("=" * 80)
        logger.info("Testing Model Registry and Bundle Loading")
        logger.info("=" * 80)
        
        # Create registry
        registry = ModelRegistry()
        
        # List all handles
        handles = registry.list_handles()
        logger.info(f"\nFound {len(handles)} model handles:")
        for i, handle in enumerate(handles):
            logger.info(f"  [{i}] scope={handle.scope}, property_type={handle.property_type}, model_name={handle.model_name}, path={handle.path}")
        
        if not handles:
            logger.warning("No model handles found! Check artifact paths.")
            return False
        
        # Try to load a handle
        logger.info("\nTesting bundle loading for first handle...")
        handle = handles[0]
        logger.info(f"Selected: {handle}")
        
        # Load estimator
        handle = registry.maybe_load_estimator(handle)
        logger.info(f"Estimator load result: load_error={handle.load_error}, estimator={handle.estimator is not None}")
        
        if handle.load_error:
            logger.error(f"Failed to load estimator: {handle.load_error}")
            return False
        
        # Load bundle
        handle = registry.maybe_load_bundle(handle)
        logger.info(f"Bundle load result: bundle_error={handle.bundle_error}, bundle={handle.bundle is not None}")
        
        if handle.bundle_error:
            logger.error(f"Failed to load bundle: {handle.bundle_error}")
            return False
        
        if not handle.bundle:
            logger.error("Bundle is None!")
            return False
        
        logger.info(f"\n✓ Bundle successfully loaded!")
        logger.info(f"  - Model name: {handle.bundle.model_name}")
        logger.info(f"  - Property scope: {handle.bundle.property_scope}")
        logger.info(f"  - Feature columns: {handle.bundle.feature_columns[:5]}... ({len(handle.bundle.feature_columns)} total)")
        logger.info(f"  - Processor available: {handle.bundle.processor is not None}")
        logger.info(f"  - Uses proxy price features: {handle.bundle.uses_proxy_price_features}")
        
        return True
        
    except Exception as e:
        logger.exception(f"Error during testing: {e}")
        return False

if __name__ == '__main__':
    success = test_bundle_loading()
    sys.exit(0 if success else 1)
