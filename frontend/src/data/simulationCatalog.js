export const DEFAULT_SIMULATION_PROFILE = {
  scenario: 'baseline',
  months: 12,
  seed: 2026,
  agentScale: 'medium',
};

export const SIMULATION_DATA_SOURCES = [
  { name: 'properties.csv', layer: 'Market seed', purpose: 'Canonical property inventory used to initialize prices, locations, and listing states.' },
  { name: 'buyers_synthetic.csv', layer: 'Agent population', purpose: 'Buyer preferences, budgets, and risk profiles.' },
  { name: 'investors_synthetic.csv', layer: 'Agent population', purpose: 'Investor portfolios, capital intensity, and holding behavior.' },
  { name: 'developers_synthetic.csv', layer: 'Agent population', purpose: 'Developer supply decisions and construction capacity.' },
  { name: 'economic_indicators.csv', layer: 'Macro inputs', purpose: 'Rates, inflation, income, and purchasing power proxies.' },
  { name: 'infrastructure_index.csv', layer: 'Structural inputs', purpose: 'Infrastructure quality and accessibility signals by governorate.' },
  { name: 'policy_rules.csv', layer: 'Policy inputs', purpose: 'Tax, subsidy, and zoning policy levers.' },
  { name: 'valuation_signals.csv', layer: 'Scoring inputs', purpose: 'Price, under/over-pricing, and model-derived signals.' },
  { name: 'market_trends.csv', layer: 'Forecast inputs', purpose: 'Demand, volatility, and growth trend scaffolding.' },
  { name: 'climate_risk.csv', layer: 'Risk inputs', purpose: 'Flood, heat, and climate stress indicators.' },
  { name: 'delegations.csv', layer: 'Geography', purpose: 'Governorate and delegation mapping for geographic resolution.' },
];

export const SIMULATION_MODEL_REGISTRY = [
  { name: 'SimulationRun', role: 'Run orchestration', detail: 'Stores scenario configuration, state, timestamps, and error metadata.' },
  { name: 'Agent', role: 'Population state', detail: 'Buyer, seller, investor, developer, bank, and government agent records.' },
  { name: 'AgentAction', role: 'Decision audit', detail: 'Per-timestep action history with rationales and outcomes.' },
  { name: 'AgentPortfolio', role: 'Holdings ledger', detail: 'Cash, debt, assets, and ROI metrics for portfolio holders.' },
  { name: 'PropertyFeature', role: 'Feature store', detail: 'Seven engineered market features for each property at each timestep.' },
  { name: 'MarketState', role: 'Market snapshot', detail: 'Monthly market metrics, policy state, volatility, and regional aggregates.' },
  { name: 'Transaction', role: 'Settlement record', detail: 'Completed deal history used by metrics, exports, and comparison.' },
  { name: 'MarketMetrics', role: 'Derived KPIs', detail: 'Aggregate indicators used by reports, charts, and export packages.' },
  { name: 'ScenarioContext', role: 'Scenario metadata', detail: 'Resolved scenario identity, version, and categorical dimensions.' },
  { name: 'EconomicRegime', role: 'Scenario regime', detail: 'Interest rate, credit, inflation, liquidity, and fiscal stance.' },
  { name: 'BehavioralModifiers', role: 'Scenario pressure', detail: 'Demand, supply, sentiment, risk aversion, and developer confidence modifiers.' },
];

export const AGENT_SPECIFICATIONS = [
  { type: 'Buyer', behavior: 'Searches for properties, ranks utility, and submits offers under budget constraints.', decisionFocus: 'Affordability, location quality, demand pressure.' },
  { type: 'Seller', behavior: 'Adjusts listing prices, responds to offers, and delists when patience is exhausted.', decisionFocus: 'Demand, momentum, time on market.' },
  { type: 'Investor', behavior: 'Buys undervalued assets, sells mature holdings, and rebalances portfolios.', decisionFocus: 'ROI, liquidity, portfolio concentration.' },
  { type: 'Developer', behavior: 'Launches or pauses projects based on absorption and capital capacity.', decisionFocus: 'Demand strength, project slots, construction cost.' },
  { type: 'Bank', behavior: 'Adjusts rates and LTV policy to balance affordability and systemic risk.', decisionFocus: 'Volatility, affordability stress, price trend.' },
  { type: 'Government', behavior: 'Changes taxes, subsidies, and zoning allowances to stabilize the market.', decisionFocus: 'Affordability, inequality, demand pressure.' },
];

export const ENGINE_WORKFLOW = [
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
];

export const OUTPUT_ARTIFACTS = [
  'report.json',
  'report.md',
  'report.pdf',
  'metrics_summary.json',
  'time_series.json',
  'api_contract.json',
  'raw_tables_manifest.json',
  'market_states.csv',
  'market_metrics.csv',
  'transactions.csv',
  'market_states.parquet',
  'market_metrics.parquet',
  'transactions.parquet',
];

export const SCENARIO_LIBRARY = [
  { name: 'baseline', type: 'reference', description: 'Neutral market dynamics with mild inflation pressure.', demand: 1.00, supply: 1.00, sentiment: 1.00, rate: 0.045, tax: 0.03, ltv: 0.80, developerConfidence: 1.00 },
  { name: 'infrastructure_push', type: 'structural', description: 'Infrastructure-led structural uplift with neutral macro pressure.', demand: 1.22, supply: 1.00, sentiment: 1.00, rate: 0.045, tax: 0.03, ltv: 0.80, developerConfidence: 1.16 },
  { name: 'interest_rate_hike', type: 'stress', description: 'Monetary tightening shock with risk-off behavior.', demand: 0.92, supply: 1.00, sentiment: 0.85, rate: 0.055, tax: 0.03, ltv: 0.75, developerConfidence: 0.92 },
  { name: 'liquidity_crunch', type: 'stress', description: 'Credit and liquidity stress with market-wide sentiment deterioration.', demand: 0.86, supply: 1.00, sentiment: 0.85, rate: 0.045, tax: 0.03, ltv: 0.80, developerConfidence: 0.88 },
  { name: 'policy_tightening', type: 'stress', description: 'Restrictive policy stance to cool overheated segments.', demand: 0.90, supply: 1.00, sentiment: 0.85, rate: 0.050, tax: 0.04, ltv: 0.75, developerConfidence: 0.90 },
  { name: 'monetary_easing', type: 'structural', description: 'Accommodative rates and credit conditions to stimulate demand.', demand: 1.08, supply: 1.00, sentiment: 1.08, rate: 0.035, tax: 0.03, ltv: 0.86, developerConfidence: 1.04 },
  { name: 'supply_expansion', type: 'structural', description: 'Pro-construction policy with supply-side expansion.', demand: 1.06, supply: 1.25, sentiment: 1.00, rate: 0.045, tax: 0.03, ltv: 0.80, developerConfidence: 1.20 },
  { name: 'speculative_boom', type: 'stress', description: 'Elevated investor appetite and momentum-driven pricing.', demand: 1.12, supply: 1.00, sentiment: 1.30, rate: 0.038, tax: 0.03, ltv: 0.88, developerConfidence: 1.05 },
  { name: 'climate_stress', type: 'stress', description: 'Climate-risk pressure with confidence deterioration.', demand: 0.88, supply: 0.92, sentiment: 0.85, rate: 0.045, tax: 0.04, ltv: 0.80, developerConfidence: 0.92 },
];
