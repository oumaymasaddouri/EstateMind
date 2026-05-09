"""
Forecast service built on DelegationForecast and core delegation benchmarks.

DelegationForecast stores prices in millimes, so values are converted to TND/m²
at the API boundary for display and charting.
"""
from __future__ import annotations

from datetime import date
import logging
from typing import Iterable

logger = logging.getLogger(__name__)

MAPE = 2.50 / 100


def _tnd(millimes):
    return round(float(millimes or 0) / 1000, 2)


def _month_label(value):
    if isinstance(value, str):
        value = date.fromisoformat(value)
    return value.strftime('%b %Y')


def _trend(growth_pct):
    if growth_pct >= 2:
        return 'rising'
    if growth_pct <= -2:
        return 'falling'
    return 'stable'


def _latest_origin():
    from valuation.models import DelegationForecast

    return (
        DelegationForecast.objects.order_by('-forecast_origin')
        .values_list('forecast_origin', flat=True)
        .first()
    )


def _latest_rows(**filters):
    from valuation.models import DelegationForecast

    latest_origin = _latest_origin()
    if latest_origin is None:
        return DelegationForecast.objects.none()
    return DelegationForecast.objects.filter(forecast_origin=latest_origin, **filters)


def _delegation_price_range(row, property_type: str = 'apartment') -> dict | None:
    from core.models import Delegation

    delegation = None
    if getattr(row, 'delegation_fk_id', None):
        delegation = row.delegation_fk
    if delegation is None and row.governorate:
        delegation = (
            Delegation.objects.filter(region__governorate__iexact=row.governorate, name__iexact=row.delegation_name)
            .first()
        )
    if delegation is None:
        return None

    field_map = {
        'apartment': ('apt_min_tnd', 'apt_avg_tnd', 'apt_max_tnd', 'apt_trend_pct'),
        'house': ('house_min_tnd', 'house_avg_tnd', 'house_max_tnd', 'house_trend_pct'),
        'commercial': ('comm_min_tnd', 'comm_avg_tnd', 'comm_max_tnd', 'comm_trend_pct'),
        'land': ('land_min_tnd', 'land_avg_tnd', 'land_max_tnd', 'land_trend_pct'),
    }
    min_field, avg_field, max_field, trend_field = field_map.get((property_type or 'apartment').lower(), field_map['apartment'])
    return {
        'min': getattr(delegation, min_field, None),
        'avg': getattr(delegation, avg_field, None),
        'max': getattr(delegation, max_field, None),
        'annual_trend_pct': getattr(delegation, trend_field, None),
        'notes': 'Derived from core delegation benchmarks.',
    }


def _build_months(rows: Iterable) -> list[dict]:
    months = []
    for row in rows:
        price = _tnd(row.predicted_price_per_m2)
        months.append({
            'horizon': row.horizon_idx,
            'month': str(row.forecast_month),
            'month_label': _month_label(row.forecast_month),
            'price_per_m2': price,
            'lower': round(price * (1 - MAPE), 2),
            'upper': round(price * (1 + MAPE), 2),
        })
    return months


def get_delegation_forecast(delegation_name: str, property_type: str = 'apartment'):
    rows = list(_latest_rows(delegation_name__iexact=delegation_name).order_by('horizon_idx'))
    if not rows:
        return None

    months = _build_months(rows)
    first = months[0]['price_per_m2']
    mid = months[5]['price_per_m2'] if len(months) >= 6 else first
    last = months[-1]['price_per_m2']
    g6 = round((mid - first) / first * 100, 2) if first else 0
    g12 = round((last - first) / first * 100, 2) if first else 0

    return {
        'delegation': rows[0].delegation_name,
        'governorate': rows[0].governorate,
        'property_type': property_type,
        'forecast_origin': str(rows[0].forecast_origin),
        'model_mape_pct': rows[0].model_mape_pct,
        'model_version': rows[0].model_version,
        'months': months,
        'price_range': _delegation_price_range(rows[0], property_type),
        'summary': {
            'current_price_per_m2': first,
            'price_6m': mid,
            'price_12m': last,
            'growth_pct_6m': g6,
            'growth_pct_12m': g12,
            'trend': _trend(g12),
        },
    }


def get_market_data(property_type: str = 'apartment'):
    rows = list(_latest_rows().order_by('governorate', 'delegation_name'))
    if not rows:
        return None

    by_name: dict[str, list] = {}
    for row in rows:
        by_name.setdefault(row.delegation_name, []).append(row)

    delegations = []
    avgs = []
    for delegation_name, items in by_name.items():
        first = _tnd(items[0].predicted_price_per_m2)
        last = _tnd(items[-1].predicted_price_per_m2)
        growth_12m = round((last - first) / first * 100, 2) if first else 0
        avgs.append(first)
        price_range = _delegation_price_range(items[0], property_type)
        delegations.append({
            'delegation': delegation_name,
            'governorate': items[0].governorate,
            'price_min': price_range['min'] if price_range else None,
            'price_avg': price_range['avg'] if price_range else first,
            'price_max': price_range['max'] if price_range else None,
            'price_12m': last,
            'annual_trend_pct': price_range['annual_trend_pct'] if price_range else growth_12m,
            'growth_pct_12m': growth_12m,
            'trend': _trend(growth_12m),
            'notes': price_range['notes'] if price_range else 'Forecast derived from latest valuation model.',
        })

    national_avg = round(sum(avgs) / len(avgs), 0) if avgs else 0
    by_price = sorted(delegations, key=lambda x: (x['price_avg'] or 0), reverse=True)
    by_growth = sorted(delegations, key=lambda x: (x['growth_pct_12m'] or 0), reverse=True)

    return {
        'property_type': property_type,
        'total_delegations': len(delegations),
        'national_avg': national_avg,
        'top_price': {'delegation': by_price[0]['delegation'], 'governorate': by_price[0]['governorate'], 'value': by_price[0]['price_avg']} if by_price else None,
        'top_growth': {'delegation': by_growth[0]['delegation'], 'governorate': by_growth[0]['governorate'], 'pct': by_growth[0]['growth_pct_12m']} if by_growth else None,
        'top_decline': {'delegation': by_growth[-1]['delegation'], 'governorate': by_growth[-1]['governorate'], 'pct': by_growth[-1]['growth_pct_12m']} if by_growth else None,
        'delegations': delegations,
    }


def get_governorate_forecast_summary(governorate: str, property_type: str = 'apartment'):
    from django.db.models import Avg

    qs = _latest_rows(governorate__iexact=governorate)
    if not qs.exists():
        return None

    monthly_avgs = (
        qs.values('horizon_idx', 'forecast_month')
        .annotate(avg_price=Avg('predicted_price_per_m2'))
        .order_by('horizon_idx')
    )

    months = []
    for row in monthly_avgs:
        price = _tnd(row['avg_price'])
        months.append({
            'horizon': row['horizon_idx'],
            'month': str(row['forecast_month']),
            'month_label': _month_label(row['forecast_month']),
            'price_per_m2': price,
            'lower': round(price * (1 - MAPE), 2),
            'upper': round(price * (1 + MAPE), 2),
        })
    if not months:
        return None

    first = months[0]['price_per_m2']
    mid = months[5]['price_per_m2'] if len(months) >= 6 else first
    last = months[-1]['price_per_m2']
    g6 = round((mid - first) / first * 100, 2) if first else 0
    g12 = round((last - first) / first * 100, 2) if first else 0

    return {
        'governorate': governorate,
        'property_type': property_type,
        'delegation_count': qs.values('delegation_name').distinct().count(),
        'months': months,
        'top_delegations': _get_top_delegations(governorate, limit=5),
        'summary': {
            'current_price_per_m2': first,
            'price_6m': mid,
            'price_12m': last,
            'growth_pct_6m': g6,
            'growth_pct_12m': g12,
            'trend': _trend(g12),
        },
    }


def _get_top_delegations(governorate: str, limit: int = 5):
    from django.db.models import Avg

    d1 = _latest_rows(governorate__iexact=governorate, horizon_idx=1).values('delegation_name').annotate(avg1=Avg('predicted_price_per_m2'))
    d12 = _latest_rows(governorate__iexact=governorate, horizon_idx=12).values('delegation_name').annotate(avg12=Avg('predicted_price_per_m2'))

    d1_map = {row['delegation_name']: row['avg1'] for row in d1}
    d12_map = {row['delegation_name']: row['avg12'] for row in d12}

    result = []
    for name, price1 in d1_map.items():
        if not price1:
            continue
        price12 = d12_map.get(name, price1)
        growth = round((price12 - price1) / price1 * 100, 2) if price1 else 0
        result.append({
            'delegation': name,
            'price_jan_tnd': _tnd(price1),
            'price_dec_tnd': _tnd(price12),
            'growth_pct_12m': growth,
        })
    result.sort(key=lambda x: x['growth_pct_12m'], reverse=True)
    return result[:limit]


def get_national_summary(property_type: str = 'apartment'):
    from django.db.models import Avg

    d1_qs = _latest_rows(horizon_idx=1).values('delegation_name', 'governorate').annotate(avg1=Avg('predicted_price_per_m2'))
    d12_qs = _latest_rows(horizon_idx=12).values('delegation_name').annotate(avg12=Avg('predicted_price_per_m2'))

    d1_map = {row['delegation_name']: (row['avg1'], row['governorate']) for row in d1_qs}
    d12_map = {row['delegation_name']: row['avg12'] for row in d12_qs}

    delegations = []
    for name, (price1, gov) in d1_map.items():
        if not price1:
            continue
        price12 = d12_map.get(name, price1)
        growth = round((price12 - price1) / price1 * 100, 2) if price1 else 0
        delegations.append({
            'delegation': name,
            'governorate': gov,
            'price_jan_tnd': _tnd(price1),
            'price_dec_tnd': _tnd(price12),
            'growth_pct_12m': growth,
        })

    delegations.sort(key=lambda x: x['growth_pct_12m'], reverse=True)
    return {
        'property_type': property_type,
        'top_delegations': delegations[:10],
        'total_delegations': len(delegations),
    }


def list_governorates_with_forecasts():
    return sorted(
        _latest_rows()
        .exclude(governorate='')
        .values_list('governorate', flat=True)
        .distinct()
    )


def list_delegations_for_governorate(governorate: str):
    return sorted(
        _latest_rows(governorate__iexact=governorate)
        .values_list('delegation_name', flat=True)
        .distinct()
    )
