"""
Main valuation orchestrator — full pipeline.
"""
import logging

from . import heuristic, comparables, confidence, shap_service, nlp_service, explanation, response_builder, scenario_service
from .image_service import analyze_images
from core.services.climate_intelligence import climate_price_adjustment, compute_risk_score

logger = logging.getLogger(__name__)


def estimate(data: dict, image_files: list | None = None) -> dict:
    """
    End-to-end valuation pipeline.
    data         — validated dict from ValuationInputSerializer.
    image_files  — list of InMemoryUploadedFile objects (may be empty).
    """
    image_files = image_files or []

    # 1 ── Heuristic / ML prediction
    prediction = heuristic.estimate(data)
    logger.info(
        "Valuation: gov=%s type=%s size=%s mode=%s price=%s",
        data.get('governorate', ''),
        data.get('property_type', ''),
        data.get('size_m2', ''),
        prediction['prediction_mode'],
        prediction['estimated_price'],
    )

    # 2 ── Comparables + market context (Gold layer query)
    comps, market_ctx = comparables.find(data, prediction['estimated_price'])

    # 3 ── Confidence scoring
    conf_result = confidence.compute(data, prediction, comps, image_files)

    # Override bounds
    prediction['lower_bound'] = conf_result['lower_bound']
    prediction['upper_bound'] = conf_result['upper_bound']

    # 4 ── SHAP-like feature attribution
    shap_result = shap_service.explain(data, prediction)

    # 5 ── NLP analysis (description + location sentiment)
    desc = data.get('description', '')
    text_analysis = nlp_service.analyze_description(desc)
    loc_sentiment = nlp_service.analyze_location(
        data.get('delegation') or data.get('city', ''),
        data.get('governorate', ''),
    )
    text_analysis['location_sentiment'] = loc_sentiment

    # 6 ── Sentiment price refinement (±3%, bounded to [0.97, 1.03])
    if text_analysis.get('sentiment_label') == 'positive':
        refinement = 1.015
    elif text_analysis.get('sentiment_label') == 'negative':
        refinement = 0.985
    else:
        refinement = 1.0
    prediction['estimated_price'] = round(prediction['estimated_price'] * refinement)
    prediction['price_per_m2']    = round(prediction['price_per_m2'] * refinement, 1)

    # 7 ── Vision / image analysis
    image_analysis = analyze_images(image_files)
    # Update image_count in data for confidence signal
    data = {**data, 'image_count': len(image_files)}

    # 8 ── Climate risk price adjustment
    gov = data.get('governorate', '')
    climate_info = {}
    if gov:
        try:
            _, risk_category = compute_risk_score(gov)
            adj_pct, adj_label = climate_price_adjustment(
                gov,
                property_type=data.get('property_type', 'apartment'),
                risk_category=risk_category,
            )
            climate_adj_price = round(prediction['estimated_price'] * (1 + adj_pct / 100))
            climate_info = {
                'climate_risk_category':  risk_category,
                'climate_adjustment_pct': adj_pct,
                'climate_adjusted_price': climate_adj_price,
                'climate_label':          adj_label,
            }
            logger.info(
                'Climate adjustment for %s: %s%% (%s) → %s TND',
                gov, adj_pct, adj_label, climate_adj_price,
            )
        except Exception as exc:
            logger.warning('Climate adjustment failed for %s: %s', gov, exc)

    # 9 ── AI narrative explanation
    ai_text = explanation.build(
        data, prediction, conf_result, comps, market_ctx, text_analysis, shap_result
    )

    # 10 ── What-if scenario simulation
    scenario_rows, recommendations = scenario_service.generate(
        data=data,
        estimated_price=prediction['estimated_price'],
        comparables=comps,
        confidence_result=conf_result,
        text_analysis=text_analysis,
        features_impact=shap_result.get('features_impact', []),
    )

    # 11 ── Assemble final response
    result = response_builder.build(
        data, prediction, conf_result, shap_result,
        comps, market_ctx, text_analysis, ai_text, image_analysis,
        scenarios=scenario_rows,
        recommendations=recommendations,
    )
    result.update(climate_info)
    return result
