"""
Feature attribution service — heuristic SHAP-like waterfall.
Ranks feature contributions and emits frontend-ready impact list + waterfall.
"""
import math


# Human-readable feature labels
_LABELS = {
    'location':            'Location',
    'size':                'Property Size',
    'condition':           'Condition',
    'bedrooms':            'Bedroom Layout',
    'Swimming Pool':       'Swimming Pool',
    'Garden':              'Garden',
    'Parking':             'Parking',
    'Sea View':            'Sea View',
    'Elevator':            'Elevator',
    'description_quality': 'Description Quality',
}


def explain(data: dict, prediction: dict) -> dict:
    """
    Returns dict with:
      features_impact — sorted list of {feature, impact, direction, percent}
      shap            — {baseline, contributions, predicted}
    """
    contributions: dict = prediction.get('contributions', {})
    estimated_price  = float(prediction.get('estimated_price', 0))
    base_total       = float(prediction.get('base_total', estimated_price * 0.60))

    if not contributions:
        return _fallback(data, estimated_price, base_total)

    # Filter near-zero contributions
    significant = {k: v for k, v in contributions.items() if abs(v) > estimated_price * 0.001}

    # Sort by absolute magnitude
    ranked = sorted(significant.items(), key=lambda kv: abs(kv[1]), reverse=True)

    features_impact = []
    waterfall_items = []
    running = base_total

    for feat, val in ranked[:8]:
        label = _LABELS.get(feat, feat.replace('_', ' ').title())
        direction = 'positive' if val >= 0 else 'negative'
        pct = abs(val) / max(estimated_price, 1) * 100
        features_impact.append({
            'feature':   label,
            'impact':    round(abs(val)),
            'direction': direction,
            'percent':   round(pct, 1),
        })
        running += val
        waterfall_items.append({
            'feature': label,
            'delta':   round(val),
            'running': round(running),
        })

    return {
        'features_impact': features_impact,
        'shap': {
            'baseline':      round(base_total),
            'contributions': waterfall_items,
            'predicted':     round(estimated_price),
        },
    }


def _fallback(data: dict, estimated_price: float, base_total: float) -> dict:
    """Minimal attribution when contributions dict is empty."""
    size_m2 = float(data.get('size_m2') or 100)
    impacts = [
        {'feature': 'Property Size', 'impact': round(size_m2 * 1_800 * 0.1), 'direction': 'positive', 'percent': 10.0},
    ]
    return {
        'features_impact': impacts,
        'shap': {
            'baseline':      round(base_total),
            'contributions': [{'feature': 'Property Size', 'delta': round(size_m2 * 1_800 * 0.1), 'running': round(estimated_price)}],
            'predicted':     round(estimated_price),
        },
    }
