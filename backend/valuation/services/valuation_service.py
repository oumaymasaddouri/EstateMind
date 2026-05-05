"""Model-backed valuation orchestrator."""

import logging

from . import comparables, confidence, explanation, response_builder, scenario_service, shap_service

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
    mapped = map_request(data)
    registry = ModelRegistry()
    fallback_service = FallbackTabularModelService()
    cv_service = CVModelService()
    sentiment_service = SentimentModelService()

    # 1 ── Price prediction (primary)
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

    if prediction is None:
        raise RuntimeError("No valuation model artifacts could be loaded from the repository")
    logger.info(
        "Valuation: gov=%s type=%s size=%s mode=%s price=%s",
        data.get('governorate', ''),
        data.get('property_type', ''),
        data.get('size_m2', ''),
        prediction['prediction_mode'],
        prediction['estimated_price'],
    )

    # 2 ── Image analysis (CV model)
    image_analysis = None
    cv_prediction = None
    if image_files:
        try:
            cv_prediction = cv_service.analyze_images(image_files)
            if cv_prediction:
                image_analysis = {
                    'image_count': len(image_files),
                    'property_type_predicted': cv_prediction.property_type,
                    'quality_score': cv_prediction.image_quality_score,
                    'coverage_score': cv_prediction.coverage_score,
                    'confidence': cv_prediction.confidence,
                    'status': cv_prediction.status,
                    'cv_mode': 'vision_enabled',
                    'image_analysis': f"Analyzed {len(image_files)} image(s), predicted property type: {cv_prediction.property_type}",
                    'warnings': cv_prediction.warnings,
                }
        except Exception as exc:
            logger.warning("CV analysis failed: %s", exc)
            image_analysis = {
                'image_count': len(image_files),
                'quality_score': 0.0,
                'coverage_score': 0.0,
                'status': 'analysis_failed',
                'cv_mode': 'vision_error',
                'image_analysis': 'Image analysis failed',
                'warnings': [str(exc)],
            }
    
    if not image_analysis:
        image_analysis = {
            'image_count': 0,
            'quality_score': 0.0,
            'coverage_score': 0.0,
            'status': 'no_images',
            'cv_mode': 'not_used',
            'image_analysis': 'No images uploaded.',
            'warnings': [],
        }

    # 3 ── Sentiment analysis (text model)
    text_analysis = None
    sentiment_prediction = None
    try:
        description = data.get('description', '')
        sentiment_prediction = sentiment_service.analyze_description(description)
        if sentiment_prediction:
            text_analysis = {
                'description_quality': sentiment_prediction.description_quality,
                'description_sentiment': sentiment_prediction.sentiment_score,
                'description_sentiment_label': sentiment_prediction.sentiment_label,
                'location_sentiment': 0.5,  # Placeholder for future location sentiment
                'location_sentiment_label': 'neutral',
                'marketing_effectiveness': 'Evaluated' if description else 'Not evaluated',
                'key_phrases': sentiment_prediction.key_phrases,
                'token_count': sentiment_prediction.token_count,
                'description_score': sentiment_prediction.description_score,
                'sentiment_mode': 'tfidf_enabled',
                'warnings': sentiment_prediction.warnings,
            }
    except Exception as exc:
        logger.warning("Sentiment analysis failed: %s", exc)
    
    if not text_analysis:
        text_analysis = {
            'description_quality': 'Not evaluated',
            'description_sentiment': 0.5,
            'description_sentiment_label': 'neutral',
            'location_sentiment': 0.5,
            'location_sentiment_label': 'neutral',
            'marketing_effectiveness': 'Not evaluated',
            'key_phrases': [],
            'token_count': 0,
            'description_score': 0,
            'sentiment_mode': 'not_used',
            'warnings': [],
        }

    # 4 ── Comparables + market context
    comps, market_ctx = comparables.find(data, prediction['estimated_price'])

    # 5 ── Price drivers, confidence scoring, and scenarios
    shap_result = shap_service.explain(data, prediction)
    conf_result = confidence.compute(data, prediction, comps, image_files)
    scenarios, recommendations = scenario_service.generate(
        data,
        prediction['estimated_price'],
        comps,
        conf_result,
        text_analysis,
        shap_result.get('features_impact', []),
    )

    # Override bounds
    prediction['lower_bound'] = conf_result['lower_bound']
    prediction['upper_bound'] = conf_result['upper_bound']

    # 6 ── Explanation
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

    result = response_builder.build(
        data, prediction, conf_result, shap_result,
        comps, market_ctx, text_analysis, ai_text,
        image_analysis=image_analysis,
        scenarios=scenarios,
        recommendations=recommendations,
    )
    return result
