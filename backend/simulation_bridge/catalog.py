from __future__ import annotations

from math import pi, sin
from typing import Any, Dict, List

SIMULATION_DATA_SOURCES = [
    {"name": "properties.csv", "layer": "Market seed", "purpose": "Canonical property inventory used to initialize prices, locations, and listing states."},
    {"name": "buyers_synthetic.csv", "layer": "Agent population", "purpose": "Buyer preferences, budgets, and risk profiles."},
    {"name": "investors_synthetic.csv", "layer": "Agent population", "purpose": "Investor portfolios, capital intensity, and holding behavior."},
    {"name": "developers_synthetic.csv", "layer": "Agent population", "purpose": "Developer supply decisions and construction capacity."},
    {"name": "economic_indicators.csv", "layer": "Macro inputs", "purpose": "Rates, inflation, income, and purchasing power proxies."},
    {"name": "infrastructure_index.csv", "layer": "Structural inputs", "purpose": "Infrastructure quality and accessibility signals by governorate."},
    {"name": "policy_rules.csv", "layer": "Policy inputs", "purpose": "Tax, subsidy, and zoning policy levers."},
    {"name": "valuation_signals.csv", "layer": "Scoring inputs", "purpose": "Price, under/over-pricing, and model-derived signals."},
    {"name": "market_trends.csv", "layer": "Forecast inputs", "purpose": "Demand, volatility, and growth trend scaffolding."},
    {"name": "climate_risk.csv", "layer": "Risk inputs", "purpose": "Flood, heat, and climate stress indicators."},
    {"name": "delegations.csv", "layer": "Geography", "purpose": "Governorate and delegation mapping for geographic resolution."},
]

SIMULATION_MODEL_REGISTRY = [
    {"name": "SimulationRun", "role": "Run orchestration", "detail": "Stores scenario configuration, state, timestamps, and error metadata."},
    {"name": "Agent", "role": "Population state", "detail": "Buyer, seller, investor, developer, bank, and government agent records."},
    {"name": "AgentAction", "role": "Decision audit", "detail": "Per-timestep action history with rationales and outcomes."},
    {"name": "AgentPortfolio", "role": "Holdings ledger", "detail": "Cash, debt, assets, and ROI metrics for portfolio holders."},
    {"name": "PropertyFeature", "role": "Feature store", "detail": "Seven engineered market features for each property at each timestep."},
    {"name": "MarketState", "role": "Market snapshot", "detail": "Monthly market metrics, policy state, volatility, and regional aggregates."},
    {"name": "Transaction", "role": "Settlement record", "detail": "Completed deal history used by metrics, exports, and comparison."},
    {"name": "MarketMetrics", "role": "Derived KPIs", "detail": "Aggregate indicators used by reports, charts, and export packages."},
    {"name": "ScenarioContext", "role": "Scenario metadata", "detail": "Resolved scenario identity, version, and categorical dimensions."},
    {"name": "EconomicRegime", "role": "Scenario regime", "detail": "Interest rate, credit, inflation, liquidity, and fiscal stance."},
    {"name": "BehavioralModifiers", "role": "Scenario pressure", "detail": "Demand, supply, sentiment, risk aversion, and developer confidence modifiers."},
]

AGENT_SPECIFICATIONS = [
    {"type": "Buyer", "behavior": "Searches for properties, ranks utility, and submits offers under budget constraints.", "decisionFocus": "Affordability, location quality, demand pressure."},
    {"type": "Seller", "behavior": "Adjusts listing prices, responds to offers, and delists when patience is exhausted.", "decisionFocus": "Demand, momentum, time on market."},
    {"type": "Investor", "behavior": "Buys undervalued assets, sells mature holdings, and rebalances portfolios.", "decisionFocus": "ROI, liquidity, portfolio concentration."},
    {"type": "Developer", "behavior": "Launches or pauses projects based on absorption and capital capacity.", "decisionFocus": "Demand strength, project slots, construction cost."},
    {"type": "Bank", "behavior": "Adjusts rates and LTV policy to balance affordability and systemic risk.", "decisionFocus": "Volatility, affordability stress, price trend."},
    {"type": "Government", "behavior": "Changes taxes, subsidies, and zoning allowances to stabilize the market.", "decisionFocus": "Affordability, inequality, demand pressure."},
]

ENGINE_WORKFLOW = [
    'Load and validate datasets',
    'Clean and normalize market inputs',
    'Process numeric fields and lifecycle states',
    'Apply pre-feature quality gates',
    'Engineer affordability, liquidity, momentum, and risk-adjusted return features',
    'Compile scenario definitions and scheduled shocks',
    'Initialize agents and market state',
    'Perceive, decide, interact, and settle transactions each month',
    'Update prices, liquidity, and regime state',
    'Persist outputs, metrics, and reports',
]

OUTPUT_ARTIFACTS = [
    'report.json', 'report.md', 'report.pdf', 'metrics_summary.json', 'time_series.json',
    'api_contract.json', 'raw_tables_manifest.json', 'market_states.csv', 'market_metrics.csv',
    'transactions.csv', 'market_states.parquet', 'market_metrics.parquet', 'transactions.parquet',
]

SCENARIO_LIBRARY = [
    {"name": "baseline", "type": "reference", "description": "Neutral market dynamics with mild inflation pressure.", "demand": 1.00, "supply": 1.00, "sentiment": 1.00, "rate": 0.045, "tax": 0.03, "ltv": 0.80, "developerConfidence": 1.00},
    {"name": "infrastructure_push", "type": "structural", "description": "Infrastructure-led structural uplift with neutral macro pressure.", "demand": 1.22, "supply": 1.00, "sentiment": 1.00, "rate": 0.045, "tax": 0.03, "ltv": 0.80, "developerConfidence": 1.16},
    {"name": "interest_rate_hike", "type": "stress", "description": "Monetary tightening shock with risk-off behavior.", "demand": 0.92, "supply": 1.00, "sentiment": 0.85, "rate": 0.055, "tax": 0.03, "ltv": 0.75, "developerConfidence": 0.92},
    {"name": "liquidity_crunch", "type": "stress", "description": "Credit and liquidity stress with market-wide sentiment deterioration.", "demand": 0.86, "supply": 1.00, "sentiment": 0.85, "rate": 0.045, "tax": 0.03, "ltv": 0.80, "developerConfidence": 0.88},
    {"name": "policy_tightening", "type": "stress", "description": "Restrictive policy stance to cool overheated segments.", "demand": 0.90, "supply": 1.00, "sentiment": 0.85, "rate": 0.050, "tax": 0.04, "ltv": 0.75, "developerConfidence": 0.90},
    {"name": "monetary_easing", "type": "structural", "description": "Accommodative rates and credit conditions to stimulate demand.", "demand": 1.08, "supply": 1.00, "sentiment": 1.08, "rate": 0.035, "tax": 0.03, "ltv": 0.86, "developerConfidence": 1.04},
    {"name": "supply_expansion", "type": "structural", "description": "Pro-construction policy with supply-side expansion.", "demand": 1.06, "supply": 1.25, "sentiment": 1.00, "rate": 0.045, "tax": 0.03, "ltv": 0.80, "developerConfidence": 1.20},
    {"name": "speculative_boom", "type": "stress", "description": "Elevated investor appetite and momentum-driven pricing.", "demand": 1.12, "supply": 1.00, "sentiment": 1.30, "rate": 0.038, "tax": 0.03, "ltv": 0.88, "developerConfidence": 1.05},
    {"name": "climate_stress", "type": "stress", "description": "Climate-risk pressure with confidence deterioration.", "demand": 0.88, "supply": 0.92, "sentiment": 0.85, "rate": 0.045, "tax": 0.04, "ltv": 0.80, "developerConfidence": 0.92},
]


def get_catalog() -> Dict[str, Any]:
    return {
        'title': 'EstateMind Multi-Agent Simulation Bridge',
        'description': 'Catalog and preview payload for the imported MultiAgent-Market-Simulation project.',
        'data_sources': SIMULATION_DATA_SOURCES,
        'models': SIMULATION_MODEL_REGISTRY,
        'agents': AGENT_SPECIFICATIONS,
        'workflow': ENGINE_WORKFLOW,
        'outputs': OUTPUT_ARTIFACTS,
        'scenarios': SCENARIO_LIBRARY,
        'scales': {
            'tiny': {'buyers': 10, 'sellers': 20, 'investors': 4, 'developers': 2, 'banks': 1, 'government': 1},
            'medium': {'buyers': 1000, 'sellers': 3000, 'investors': 120, 'developers': 40, 'banks': 3, 'government': 1},
            'large': {'buyers': 10000, 'sellers': 25000, 'investors': 500, 'developers': 120, 'banks': 3, 'government': 1},
        },
        'regional_seeds': REGIONAL_SEEDS,
    }


REGIONAL_SEEDS = [
    {'name': 'Tunis', 'basePrice': 2200, 'liquidity': 0.67, 'risk': 0.18},
    {'name': 'Ariana', 'basePrice': 2050, 'liquidity': 0.65, 'risk': 0.16},
    {'name': 'Ben Arous', 'basePrice': 1580, 'liquidity': 0.58, 'risk': 0.19},
    {'name': 'Nabeul', 'basePrice': 1720, 'liquidity': 0.61, 'risk': 0.21},
    {'name': 'Sousse', 'basePrice': 1620, 'liquidity': 0.63, 'risk': 0.20},
    {'name': 'Sfax', 'basePrice': 1480, 'liquidity': 0.56, 'risk': 0.17},
    {'name': 'Medenine', 'basePrice': 1320, 'liquidity': 0.49, 'risk': 0.27},
    {'name': 'Gafsa', 'basePrice': 980, 'liquidity': 0.42, 'risk': 0.29},
]


def run_preview(*, scenario: str, months: int, seed: int, agent_scale: str, climate_pressure: float, policy_pressure: float, capital_intensity: float) -> Dict[str, Any]:
    scenario_def = next((item for item in SCENARIO_LIBRARY if item['name'] == scenario), SCENARIO_LIBRARY[0])
    scale = get_catalog()['scales'].get(agent_scale, get_catalog()['scales']['medium'])
    shocks = _shocks_for(scenario)
    seeded_bias = ((int(seed) % 17) - 8) / 100

    price_index = 100.0
    transactions = round((scale['buyers'] * 0.16) + (scale['investors'] * 0.4) + 18)
    liquidity = _clamp(0.52 + (scenario_def['sentiment'] - 1) * 0.18 + seeded_bias * 0.3, 0.18, 0.82)
    freeze_risk = _clamp(0.22 + climate_pressure * 0.18 + policy_pressure * 0.16 - (scenario_def['demand'] - 1) * 0.18, 0.04, 0.78)
    confidence = _clamp(0.54 + scenario_def['developerConfidence'] * 0.12 + capital_intensity * 0.14, 0.05, 0.95)
    momentum = 0.0

    monthly: List[Dict[str, Any]] = []
    for month in range(1, int(months) + 1):
        phase = sin((month / 12.0) * pi * 2)
        shock = _month_shock(shocks, month)

        demand_pulse = (scenario_def['demand'] - 1) * 0.9 + shock.get('demand', 0.0) * 2.0 + capital_intensity * 0.35 + phase * 0.06
        supply_pulse = (scenario_def['supply'] - 1) * 0.8 + shock.get('supply', 0.0) * 1.8 + policy_pressure * 0.22
        sentiment_pulse = (scenario_def['sentiment'] - 1) * 0.85 + shock.get('sentiment', 0.0) * 2.0 + seeded_bias * 0.3
        climate_pulse = climate_pressure + shock.get('climate', 0.0) * 2.1
        policy_pulse = policy_pressure + shock.get('tax', 0.0) * 1.6 + abs(shock.get('ltv', 0.0)) * 2.0

        price_growth_pct = _clamp(0.35 + (demand_pulse * 3.1) - (supply_pulse * 2.7) - (policy_pulse * 1.8) - (climate_pulse * 1.5) + (momentum * 0.75), -3.5, 6.4)
        transaction_change = _clamp(1 + (demand_pulse * 0.55) - (policy_pulse * 0.22) - (climate_pulse * 0.18) + (scenario_def['developerConfidence'] - 1) * 0.12, 0.48, 1.42)

        price_index *= 1 + (price_growth_pct / 100.0)
        transactions = max(1, round(transactions * transaction_change))
        liquidity = _clamp(liquidity + (demand_pulse * 0.06) - (supply_pulse * 0.03) + (sentiment_pulse * 0.04) - (climate_pulse * 0.05) - (policy_pulse * 0.03), 0.08, 0.96)
        freeze_risk = _clamp(freeze_risk + (policy_pulse * 0.04) + (climate_pulse * 0.05) - (demand_pulse * 0.03) - (liquidity * 0.05), 0.02, 0.86)
        confidence = _clamp(confidence + (sentiment_pulse * 0.03) + (scenario_def['developerConfidence'] - 1) * 0.05 - (freeze_risk * 0.02), 0.04, 0.98)
        momentum = _clamp((momentum * 0.58) + (price_growth_pct / 100.0) * 0.75, -0.25, 0.34)

        regional_rotation = []
        for index, region in enumerate(REGIONAL_SEEDS):
            regional_growth = _clamp(price_growth_pct + (demand_pulse * 0.85) - (policy_pulse * 0.25) - (region['risk'] * 0.4), -4.0, 7.2)
            regional_rotation.append({
                'region': region['name'],
                'priceIndex': region['basePrice'] * (1 + (regional_growth / 100.0)),
                'growth': regional_growth,
                'liquidity': _clamp(region['liquidity'] + (liquidity - 0.5) * 0.5 - climate_pulse * 0.04, 0.18, 0.92),
                'risk': _clamp(region['risk'] + climate_pulse * 0.35 + policy_pulse * 0.08, 0.02, 0.92),
                'status': 'Growth leader' if index % 3 == 0 else 'Balanced',
            })

        monthly.append({
            'month': month,
            'label': f'M{month}',
            'priceIndex': price_index,
            'transactions': transactions,
            'liquidity': liquidity,
            'freezeRisk': freeze_risk,
            'confidence': confidence,
            'growth': price_growth_pct,
            'regionalRotation': regional_rotation,
        })

    final_month = monthly[-1] if monthly else {}
    top_regions = sorted(final_month.get('regionalRotation', []), key=lambda row: row['growth'], reverse=True)[:5]
    for region in top_regions:
        region['status'] = 'Risk watch' if region['risk'] >= 0.55 else ('Growth leader' if region['growth'] >= 4 else 'Balanced')

    return {
        'scenario': scenario_def,
        'scale': scale,
        'monthly': monthly,
        'summary': {
            'finalPriceIndex': final_month.get('priceIndex', price_index),
            'finalGrowth': final_month.get('growth', 0.0),
            'finalLiquidity': final_month.get('liquidity', liquidity),
            'finalFreezeRisk': final_month.get('freezeRisk', freeze_risk),
            'finalConfidence': final_month.get('confidence', confidence),
            'cumulativeTransactions': sum(row['transactions'] for row in monthly),
            'topRegions': top_regions,
            'regime': 'Freezing' if final_month.get('freezeRisk', freeze_risk) > 0.55 else ('Overheating' if final_month.get('growth', 0) >= 4 else ('Contracting' if final_month.get('growth', 0) <= -1 else 'Stable')),
        },
    }


def _shocks_for(scenario: str) -> List[Dict[str, float]]:
    mapping = {
        'infrastructure_push': [{'month': 6, 'demand': 0.03, 'developerConfidence': 0.04}, {'month': 12, 'demand': 0.04, 'supply': 0.02}],
        'interest_rate_hike': [{'month': 3, 'rate': 0.005, 'sentiment': -0.03}, {'month': 8, 'rate': 0.004, 'liquidity': -0.04}],
        'liquidity_crunch': [{'month': 3, 'demand': -0.14, 'sentiment': -0.06, 'liquidity': -0.06}, {'month': 4, 'demand': -0.04, 'liquidity': -0.04}],
        'policy_tightening': [{'month': 4, 'tax': 0.01, 'ltv': -0.02}, {'month': 10, 'demand': -0.03, 'sentiment': -0.02}],
        'monetary_easing': [{'month': 2, 'demand': 0.05, 'liquidity': 0.04}, {'month': 7, 'sentiment': 0.03, 'liquidity': 0.03}],
        'supply_expansion': [{'month': 4, 'supply': 0.06, 'developerConfidence': 0.03}, {'month': 9, 'supply': 0.05, 'demand': 0.02}],
        'speculative_boom': [{'month': 2, 'demand': 0.08, 'sentiment': 0.08}, {'month': 6, 'demand': 0.04, 'liquidity': 0.03}],
        'climate_stress': [{'month': 4, 'climate': 0.05, 'demand': -0.03}, {'month': 8, 'climate': 0.04, 'supply': -0.03}],
    }
    return mapping.get(scenario, [])


def _month_shock(shocks: List[Dict[str, float]], month: int) -> Dict[str, float]:
    combined: Dict[str, float] = {}
    for shock in shocks:
        if shock.get('month') != month:
            continue
        for key, value in shock.items():
            if key == 'month':
                continue
            combined[key] = combined.get(key, 0.0) + float(value)
    return combined


def _clamp(value: float, min_value: float, max_value: float) -> float:
    return max(min_value, min(max_value, value))
