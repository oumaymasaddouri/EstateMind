from __future__ import annotations

from django.http import JsonResponse
from django.views.decorators.http import require_GET

from .catalog import get_catalog, run_preview


@require_GET
def catalog_view(request):
    return JsonResponse(get_catalog(), status=200)


@require_GET
def preview_view(request):
    scenario = request.GET.get('scenario', 'baseline')
    months = _parse_int(request.GET.get('months'), 12)
    seed = _parse_int(request.GET.get('seed'), 2026)
    agent_scale = request.GET.get('agentScale', 'medium')
    climate_pressure = _parse_float(request.GET.get('climatePressure'), 0.34)
    policy_pressure = _parse_float(request.GET.get('policyPressure'), 0.24)
    capital_intensity = _parse_float(request.GET.get('capitalIntensity'), 0.48)

    return JsonResponse(
        run_preview(
            scenario=scenario,
            months=months,
            seed=seed,
            agent_scale=agent_scale,
            climate_pressure=climate_pressure,
            policy_pressure=policy_pressure,
            capital_intensity=capital_intensity,
        ),
        status=200,
    )


def _parse_int(raw_value, default):
    try:
        return int(raw_value)
    except (TypeError, ValueError):
        return default


def _parse_float(raw_value, default):
    try:
        return float(raw_value)
    except (TypeError, ValueError):
        return default
