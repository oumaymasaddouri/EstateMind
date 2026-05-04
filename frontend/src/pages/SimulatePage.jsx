import React, { useEffect, useMemo, useState } from 'react';
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart as RechartsLineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  BarChart3,
  CheckCircle2,
  Cpu,
  Database,
  Download,
  FileText,
  Gauge,
  Globe2,
  Layers3,
  LineChart as LineChartIcon,
  MapPin,
  PlayCircle,
  RefreshCcw,
  Shield,
  Sparkles,
  Target,
  TrendingUp,
  Users,
  Workflow,
} from 'lucide-react';

import { useAuth } from '../context/AuthContext';
import { getSimulationCatalog, runSimulationPreview } from '../services/api';
import {
  AGENT_SPECIFICATIONS,
  DEFAULT_SIMULATION_PROFILE,
  ENGINE_WORKFLOW,
  OUTPUT_ARTIFACTS,
  SCENARIO_LIBRARY,
  SIMULATION_DATA_SOURCES,
  SIMULATION_MODEL_REGISTRY,
} from '../data/simulationCatalog';

const SCALE_LIBRARY = {
  tiny: { buyers: 10, sellers: 20, investors: 4, developers: 2, banks: 1, government: 1 },
  medium: { buyers: 1000, sellers: 3000, investors: 120, developers: 40, banks: 3, government: 1 },
  large: { buyers: 10000, sellers: 25000, investors: 500, developers: 120, banks: 3, government: 1 },
};

const REGIONAL_SEEDS = [
  { name: 'Tunis', basePrice: 2200, liquidity: 0.67, risk: 0.18 },
  { name: 'Ariana', basePrice: 2050, liquidity: 0.65, risk: 0.16 },
  { name: 'Ben Arous', basePrice: 1580, liquidity: 0.58, risk: 0.19 },
  { name: 'Nabeul', basePrice: 1720, liquidity: 0.61, risk: 0.21 },
  { name: 'Sousse', basePrice: 1620, liquidity: 0.63, risk: 0.2 },
  { name: 'Sfax', basePrice: 1480, liquidity: 0.56, risk: 0.17 },
  { name: 'Medenine', basePrice: 1320, liquidity: 0.49, risk: 0.27 },
  { name: 'Gafsa', basePrice: 980, liquidity: 0.42, risk: 0.29 },
];

const SHOCKS = {
  infrastructure_push: [{ month: 6, demand: 0.03, developerConfidence: 0.04 }, { month: 12, demand: 0.04, supply: 0.02 }],
  interest_rate_hike: [{ month: 3, sentiment: -0.03 }, { month: 8, liquidity: -0.04 }],
  liquidity_crunch: [{ month: 3, demand: -0.14, sentiment: -0.06, liquidity: -0.06 }, { month: 4, demand: -0.04, liquidity: -0.04 }],
  policy_tightening: [{ month: 4, tax: 0.01, ltv: -0.02 }, { month: 10, demand: -0.03, sentiment: -0.02 }],
  monetary_easing: [{ month: 2, demand: 0.05, liquidity: 0.04 }, { month: 7, sentiment: 0.03, liquidity: 0.03 }],
  supply_expansion: [{ month: 4, supply: 0.06, developerConfidence: 0.03 }, { month: 9, supply: 0.05, demand: 0.02 }],
  speculative_boom: [{ month: 2, demand: 0.08, sentiment: 0.08 }, { month: 6, demand: 0.04, liquidity: 0.03 }],
  climate_stress: [{ month: 4, climate: 0.05, demand: -0.03 }, { month: 8, climate: 0.04, supply: -0.03 }],
};

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const fmt = (value, digits = 0) => new Intl.NumberFormat('en-US', { maximumFractionDigits: digits, minimumFractionDigits: digits }).format(value);
const percent = (value, digits = 1) => `${value >= 0 ? '+' : ''}${fmt(value, digits)}%`;
const currency = (value) => `${fmt(value, 0)} TND`;

const buildLocalPreview = ({ scenario, months, seed, agentScale, climatePressure, policyPressure, capitalIntensity }) => {
  const scenarioDef = SCENARIO_LIBRARY.find((item) => item.name === scenario) || SCENARIO_LIBRARY[0];
  const scale = SCALE_LIBRARY[agentScale] || SCALE_LIBRARY.medium;
  const shocks = SHOCKS[scenario] || [];
  const seededBias = ((Number(seed) % 17) - 8) / 100;

  let priceIndex = 100;
  let transactions = Math.round((scale.buyers * 0.16) + (scale.investors * 0.4) + 18);
  let liquidity = clamp(0.52 + (scenarioDef.sentiment - 1) * 0.18 + seededBias * 0.3, 0.18, 0.82);
  let freezeRisk = clamp(0.22 + climatePressure * 0.18 + policyPressure * 0.16 - (scenarioDef.demand - 1) * 0.18, 0.04, 0.78);
  let confidence = clamp(0.54 + scenarioDef.developerConfidence * 0.12 + capitalIntensity * 0.14, 0.05, 0.95);
  let momentum = 0;
  const monthly = [];

  for (let month = 1; month <= months; month += 1) {
    const phase = Math.sin((month / 12) * Math.PI * 2);
    const shock = shocks.filter((item) => item.month === month).reduce((acc, item) => ({
      demand: (acc.demand || 0) + (item.demand || 0),
      supply: (acc.supply || 0) + (item.supply || 0),
      sentiment: (acc.sentiment || 0) + (item.sentiment || 0),
      liquidity: (acc.liquidity || 0) + (item.liquidity || 0),
      climate: (acc.climate || 0) + (item.climate || 0),
      tax: (acc.tax || 0) + (item.tax || 0),
      ltv: (acc.ltv || 0) + (item.ltv || 0),
      developerConfidence: (acc.developerConfidence || 0) + (item.developerConfidence || 0),
    }), {});

    const demandPulse = (scenarioDef.demand - 1) * 0.9 + (shock.demand || 0) * 2 + capitalIntensity * 0.35 + phase * 0.06;
    const supplyPulse = (scenarioDef.supply - 1) * 0.8 + (shock.supply || 0) * 1.8 + policyPressure * 0.22;
    const sentimentPulse = (scenarioDef.sentiment - 1) * 0.85 + (shock.sentiment || 0) * 2 + seededBias * 0.3;
    const climatePulse = climatePressure + (shock.climate || 0) * 2.1;
    const policyPulse = policyPressure + (shock.tax || 0) * 1.6 + Math.abs(shock.ltv || 0) * 2.0;

    const priceGrowthPct = clamp(0.35 + (demandPulse * 3.1) - (supplyPulse * 2.7) - (policyPulse * 1.8) - (climatePulse * 1.5) + (momentum * 0.75), -3.5, 6.4);
    const transactionChange = clamp(1 + (demandPulse * 0.55) - (policyPulse * 0.22) - (climatePulse * 0.18) + (scenarioDef.developerConfidence - 1) * 0.12, 0.48, 1.42);

    priceIndex *= 1 + (priceGrowthPct / 100);
    transactions = Math.max(1, Math.round(transactions * transactionChange));
    liquidity = clamp(liquidity + (demandPulse * 0.06) - (supplyPulse * 0.03) + (sentimentPulse * 0.04) - (climatePulse * 0.05) - (policyPulse * 0.03), 0.08, 0.96);
    freezeRisk = clamp(freezeRisk + (policyPulse * 0.04) + (climatePulse * 0.05) - (demandPulse * 0.03) - (liquidity * 0.05), 0.02, 0.86);
    confidence = clamp(confidence + (sentimentPulse * 0.03) + (scenarioDef.developerConfidence - 1) * 0.05 - (freezeRisk * 0.02), 0.04, 0.98);
    momentum = clamp((momentum * 0.58) + (priceGrowthPct / 100) * 0.75, -0.25, 0.34);

    const regionalRotation = REGIONAL_SEEDS.map((region, index) => {
      const regionalGrowth = clamp(priceGrowthPct + (demandPulse * 0.85) - (policyPulse * 0.25) - (region.risk * 0.4), -4, 7.2);
      return {
        region: region.name,
        priceIndex: region.basePrice * (1 + (regionalGrowth / 100)),
        growth: regionalGrowth,
        liquidity: clamp(region.liquidity + (liquidity - 0.5) * 0.5 - climatePulse * 0.04, 0.18, 0.92),
        risk: clamp(region.risk + climatePulse * 0.35 + policyPulse * 0.08, 0.02, 0.92),
        status: index % 3 === 0 ? 'Growth leader' : 'Balanced',
      };
    });

    monthly.push({ month, label: `M${month}`, priceIndex, transactions, liquidity, freezeRisk, confidence, growth: priceGrowthPct, regionalRotation });
  }

  const finalMonth = monthly[monthly.length - 1] || {};
  const topRegions = [...(finalMonth.regionalRotation || [])].sort((a, b) => b.growth - a.growth).slice(0, 5).map((region) => ({
    ...region,
    status: region.risk >= 0.55 ? 'Risk watch' : (region.growth >= 4 ? 'Growth leader' : 'Balanced'),
  }));

  return {
    scenario: scenarioDef,
    scale,
    monthly,
    summary: {
      finalPriceIndex: finalMonth.priceIndex || priceIndex,
      finalGrowth: finalMonth.growth || 0,
      finalLiquidity: finalMonth.liquidity || liquidity,
      finalFreezeRisk: finalMonth.freezeRisk || freezeRisk,
      finalConfidence: finalMonth.confidence || confidence,
      cumulativeTransactions: monthly.reduce((total, row) => total + row.transactions, 0),
      topRegions,
      regime: finalMonth.freezeRisk > 0.55 ? 'Freezing' : finalMonth.growth >= 4 ? 'Overheating' : finalMonth.growth <= -1 ? 'Contracting' : 'Stable',
    },
  };
};

const Pill = ({ children, tone = 'default' }) => {
  const styles = {
    default: 'border-white/10 bg-white/5 text-gray-300',
    orange: 'border-[#FF6B35]/30 bg-[#FF6B35]/10 text-[#FFB38F]',
    green: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-200',
    blue: 'border-cyan-500/30 bg-cyan-500/10 text-cyan-200',
  };
  return <span className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold ${styles[tone]}`}>{children}</span>;
};

const StatCard = ({ label, value, sub, icon: Icon, color = '#FF6B35' }) => (
  <div className="rounded-2xl border border-white/10 bg-white/5 p-5 shadow-[0_20px_80px_rgba(0,0,0,0.18)]">
    <div className="flex items-start justify-between gap-3">
      <div>
        <p className="text-xs uppercase tracking-[0.24em] text-gray-500">{label}</p>
        <p className="mt-2 text-2xl font-black text-white">{value}</p>
        {sub ? <p className="mt-1 text-sm text-gray-400">{sub}</p> : null}
      </div>
      {Icon ? <div className="rounded-xl border border-white/10 bg-white/5 p-3" style={{ color }}><Icon size={18} /></div> : null}
    </div>
  </div>
);

const SectionShell = ({ eyebrow, title, description, children, actions }) => (
  <section className="rounded-[28px] border border-white/10 bg-[#101726]/90 p-6 shadow-[0_30px_120px_rgba(0,0,0,0.24)] backdrop-blur">
    <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.32em] text-[#FFB38F]">{eyebrow}</p>
        <h2 className="mt-2 text-2xl font-black text-white">{title}</h2>
        {description ? <p className="mt-2 max-w-3xl text-sm leading-6 text-gray-400">{description}</p> : null}
      </div>
      {actions ? <div>{actions}</div> : null}
    </div>
    {children}
  </section>
);

const ControlLabel = ({ children }) => <label className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.24em] text-gray-400">{children}</label>;

const MetricTooltip = ({ active, payload }) => {
  if (!active || !payload?.length) return null;
  const point = payload[0].payload;
  return (
    <div className="rounded-2xl border border-white/10 bg-[#0B0F19] px-4 py-3 text-xs shadow-2xl">
      <p className="font-bold text-white">Month {point.month}</p>
      <p className="text-gray-300">Price index: <span className="text-[#FFB38F]">{fmt(point.priceIndex, 1)}</span></p>
      <p className="text-gray-300">Transactions: <span className="text-[#4ECDC4]">{fmt(point.transactions)}</span></p>
      <p className="text-gray-300">Liquidity: <span className="text-[#96CEB4]">{fmt(point.liquidity * 100, 1)}%</span></p>
      <p className="text-gray-300">Freeze risk: <span className="text-[#FFEAA7]">{fmt(point.freezeRisk * 100, 1)}%</span></p>
    </div>
  );
};

export default function SimulatePage() {
  const { user, upgradePlan, trackActivity } = useAuth();
  const [scenario, setScenario] = useState(DEFAULT_SIMULATION_PROFILE.scenario);
  const [months, setMonths] = useState(DEFAULT_SIMULATION_PROFILE.months);
  const [seed, setSeed] = useState(DEFAULT_SIMULATION_PROFILE.seed);
  const [agentScale, setAgentScale] = useState(DEFAULT_SIMULATION_PROFILE.agentScale);
  const [climatePressure, setClimatePressure] = useState(0.34);
  const [policyPressure, setPolicyPressure] = useState(0.24);
  const [capitalIntensity, setCapitalIntensity] = useState(0.48);
  const [runCount, setRunCount] = useState(0);
  const [savedPreview, setSavedPreview] = useState(null);
  const [catalog, setCatalog] = useState(null);
  const [backendPreview, setBackendPreview] = useState(null);

  useEffect(() => {
    getSimulationCatalog().then((response) => setCatalog(response.data)).catch(() => setCatalog(null));
  }, []);

  useEffect(() => {
    runSimulationPreview({ scenario, months, seed, agentScale, climatePressure, policyPressure, capitalIntensity })
      .then((response) => setBackendPreview(response.data))
      .catch(() => setBackendPreview(null));
  }, [scenario, months, seed, agentScale, climatePressure, policyPressure, capitalIntensity]);

  useEffect(() => {
    trackActivity?.('simulation', 'simulate_page_view', { plan: user?.plan || 'free' });
  }, [trackActivity, user?.plan]);

  const catalogData = catalog || {
    data_sources: SIMULATION_DATA_SOURCES,
    models: SIMULATION_MODEL_REGISTRY,
    agents: AGENT_SPECIFICATIONS,
    workflow: ENGINE_WORKFLOW,
    outputs: OUTPUT_ARTIFACTS,
    scenarios: SCENARIO_LIBRARY,
  };

  const localPreview = useMemo(
    () => buildLocalPreview({ scenario, months, seed, agentScale, climatePressure, policyPressure, capitalIntensity }),
    [scenario, months, seed, agentScale, climatePressure, policyPressure, capitalIntensity],
  );

  const activePreview = savedPreview || backendPreview || localPreview;
  const summary = activePreview.summary;
  const monthlySeries = activePreview.monthly.map((row) => ({ ...row, liquidityPct: row.liquidity * 100, freezePct: row.freezeRisk * 100 }));
  const currentScenario = useMemo(() => catalogData.scenarios.find((item) => item.name === scenario) || SCENARIO_LIBRARY[0], [catalogData.scenarios, scenario]);

  const handleRun = async () => {
    const result = backendPreview || localPreview;
    setSavedPreview(result);
    setRunCount((count) => count + 1);
    await trackActivity?.('simulation', 'simulate_run', { scenario, months, seed, agent_scale: agentScale, final_price_index: Number(result.summary.finalPriceIndex.toFixed(2)), regime: result.summary.regime });
  };

  const handleReset = () => {
    setScenario(DEFAULT_SIMULATION_PROFILE.scenario);
    setMonths(DEFAULT_SIMULATION_PROFILE.months);
    setSeed(DEFAULT_SIMULATION_PROFILE.seed);
    setAgentScale(DEFAULT_SIMULATION_PROFILE.agentScale);
    setClimatePressure(0.34);
    setPolicyPressure(0.24);
    setCapitalIntensity(0.48);
    setSavedPreview(null);
  };

  const handleUpgrade = async () => {
    await trackActivity?.('cta_click', 'simulate_upgrade_click', { page: 'simulate', target_plan: 'pro', trigger: 'simulation_center' });
    await upgradePlan?.('pro');
  };

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(255,107,53,0.18),_transparent_28%),radial-gradient(circle_at_90%_10%,_rgba(78,205,196,0.12),_transparent_24%),linear-gradient(180deg,#08101C_0%,#101827_40%,#08101C_100%)] px-4 pb-16 pt-24 text-white">
      <div className="mx-auto max-w-7xl space-y-8">
        <section className="overflow-hidden rounded-[32px] border border-white/10 bg-[#101726]/90 shadow-[0_40px_140px_rgba(0,0,0,0.32)] backdrop-blur">
          <div className="grid gap-8 p-7 lg:grid-cols-[1.25fr_0.75fr] lg:p-10">
            <div className="space-y-6">
              <div className="flex flex-wrap gap-2">
                <Pill tone="orange">Simulation Center</Pill>
                <Pill tone="blue">Multi-agent market engine</Pill>
                <Pill tone="green">Deterministic scenarios</Pill>
              </div>
              <div className="max-w-3xl space-y-4">
                <h1 className="text-4xl font-black leading-tight md:text-6xl">Complete market simulation, integrated into EstateMind.</h1>
                <p className="max-w-3xl text-base leading-7 text-gray-300 md:text-lg">This studio brings the full MultiAgent market stack into /simulate: data sources, agent classes, scenario catalog, workflow, and export artifacts. It is designed to read like a production system, not a demo.</p>
              </div>
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <StatCard label="Scenarios" value={catalogData.scenarios.length} sub="Reference, policy, stress, supply, climate" icon={Sparkles} color="#FF6B35" />
                <StatCard label="Agent classes" value={catalogData.agents.length} sub="Buyer, seller, investor, developer, bank, government" icon={Users} color="#4ECDC4" />
                <StatCard label="Data sources" value={catalogData.data_sources.length} sub="Market, macro, policy, and climate inputs" icon={Database} color="#96CEB4" />
                <StatCard label="Output artifacts" value={catalogData.outputs.length} sub="JSON, CSV, PDF, and run exports" icon={Download} color="#FFEAA7" />
              </div>
            </div>

            <div className="rounded-[28px] border border-white/10 bg-black/20 p-6">
              <div className="flex items-center gap-2 text-[#FFB38F]"><LineChartIcon size={18} /><span className="text-xs uppercase tracking-[0.28em]">Live preview</span></div>
              <div className="mt-4 space-y-3">
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <p className="text-[11px] uppercase tracking-[0.24em] text-gray-500">Scenario</p>
                  <p className="mt-2 text-xl font-black text-white">{currentScenario.name.replaceAll('_', ' ')}</p>
                  <p className="mt-1 text-sm text-gray-400">{currentScenario.description}</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <p className="text-[11px] uppercase tracking-[0.24em] text-gray-500">Projected regime</p>
                  <p className="mt-2 text-xl font-black text-white">{summary.regime}</p>
                  <p className="mt-1 text-sm text-gray-400">Confidence {fmt(summary.finalConfidence * 100, 0)}% · freeze risk {fmt(summary.finalFreezeRisk * 100, 1)}%</p>
                </div>
              </div>
              <div className="mt-4 rounded-2xl border border-white/10 bg-white/5 p-4">
                <p className="text-[11px] uppercase tracking-[0.24em] text-gray-500">Execution status</p>
                <div className="mt-3 flex items-center gap-3 text-sm text-gray-300"><CheckCircle2 size={16} className="text-emerald-300" /><span>{runCount > 0 ? `Completed ${runCount} run${runCount > 1 ? 's' : ''}` : 'Ready to run'}</span></div>
                <div className="mt-3 flex items-center gap-3 text-sm text-gray-300"><Target size={16} className="text-[#FFB38F]" /><span>{months} month horizon · seed {seed}</span></div>
                <div className="mt-3 flex items-center gap-3 text-sm text-gray-300"><Gauge size={16} className="text-cyan-300" /><span>{agentScale} market scale · {SCALE_LIBRARY[agentScale]?.buyers || 0} buyers seeded</span></div>
              </div>
            </div>
          </div>
        </section>

        <section className="grid gap-8 xl:grid-cols-[0.9fr_1.1fr]">
          <SectionShell eyebrow="Simulation Controls" title="Scenario studio" description="Tune the scenario, time horizon, and market pressures. The simulation preview updates instantly, and the run button captures a deterministic result for reporting and dashboarding." actions={(
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={handleReset} className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-gray-200 transition hover:border-white/20 hover:bg-white/10"><RefreshCcw size={14} /> Reset</button>
              <button type="button" onClick={handleRun} className="inline-flex items-center gap-2 rounded-xl bg-[#FF6B35] px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-[#FF6B35]/20 transition hover:scale-[1.01]"><PlayCircle size={14} /> Run simulation</button>
            </div>
          )}>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <ControlLabel>Scenario preset</ControlLabel>
                <select value={scenario} onChange={(event) => setScenario(event.target.value)} className="w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none transition focus:border-[#FF6B35]/50">
                  {catalogData.scenarios.map((item) => <option key={item.name} value={item.name}>{item.name.replaceAll('_', ' ')}</option>)}
                </select>
              </div>
              <div>
                <ControlLabel>Agent scale</ControlLabel>
                <select value={agentScale} onChange={(event) => setAgentScale(event.target.value)} className="w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none transition focus:border-[#FF6B35]/50">
                  <option value="tiny">Tiny</option>
                  <option value="medium">Medium</option>
                  <option value="large">Large</option>
                </select>
              </div>
              <div>
                <ControlLabel>Simulation horizon: {months} months</ControlLabel>
                <input type="range" min="6" max="24" step="1" value={months} onChange={(event) => setMonths(Number(event.target.value))} className="w-full accent-[#FF6B35]" />
              </div>
              <div>
                <ControlLabel>Seed</ControlLabel>
                <input type="number" value={seed} onChange={(event) => setSeed(Number(event.target.value))} className="w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none transition focus:border-[#FF6B35]/50" />
              </div>
              <div>
                <ControlLabel>Climate pressure: {fmt(climatePressure * 100, 0)}%</ControlLabel>
                <input type="range" min="0" max="1" step="0.01" value={climatePressure} onChange={(event) => setClimatePressure(Number(event.target.value))} className="w-full accent-[#4ECDC4]" />
              </div>
              <div>
                <ControlLabel>Policy pressure: {fmt(policyPressure * 100, 0)}%</ControlLabel>
                <input type="range" min="0" max="1" step="0.01" value={policyPressure} onChange={(event) => setPolicyPressure(Number(event.target.value))} className="w-full accent-[#FFEAA7]" />
              </div>
              <div className="md:col-span-2">
                <ControlLabel>Capital intensity: {fmt(capitalIntensity * 100, 0)}%</ControlLabel>
                <input type="range" min="0" max="1" step="0.01" value={capitalIntensity} onChange={(event) => setCapitalIntensity(Number(event.target.value))} className="w-full accent-[#96CEB4]" />
              </div>
            </div>
            <div className="mt-6 rounded-2xl border border-white/10 bg-white/5 p-5">
              <div className="flex flex-wrap gap-2">
                <Pill tone="orange">{currentScenario.type}</Pill>
                <Pill tone="blue">{months} months</Pill>
                <Pill tone="green">Seed {seed}</Pill>
                <Pill>{runCount > 0 ? 'Executed' : 'Preview only'}</Pill>
              </div>
              <p className="mt-4 text-sm leading-6 text-gray-300">The engine blends demand, supply, climate, policy, and capital intensity into one deterministic path. Scenario shocks are injected at their scheduled months, mirroring the registry-driven runtime used by the imported multi-agent project.</p>
            </div>
          </SectionShell>

          <SectionShell eyebrow="Outcome Preview" title="Projected market path" description="The chart shows the projected price index, transaction volume, liquidity, and freeze risk. Values shift as scenario pressure and agent scale change.">
            <div className="grid gap-4 md:grid-cols-4">
              <StatCard label="Final price index" value={fmt(summary.finalPriceIndex, 1)} sub={`Growth ${percent(summary.finalGrowth, 1)} from start`} icon={TrendingUp} color="#FF6B35" />
              <StatCard label="Liquidity" value={`${fmt(summary.finalLiquidity * 100, 1)}%`} sub="Market flow at final month" icon={Gauge} color="#4ECDC4" />
              <StatCard label="Freeze risk" value={`${fmt(summary.finalFreezeRisk * 100, 1)}%`} sub={summary.finalFreezeRisk > 0.5 ? 'Elevated stress' : 'Contained stress'} icon={Sparkles} color="#FFEAA7" />
              <StatCard label="Transactions" value={fmt(summary.cumulativeTransactions)} sub="Cumulative across horizon" icon={BarChart3} color="#96CEB4" />
            </div>
            <div className="mt-6 grid gap-6 xl:grid-cols-[1.4fr_0.6fr]">
              <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                <ResponsiveContainer width="100%" height={320}>
                  <RechartsLineChart data={monthlySeries} margin={{ top: 10, right: 20, bottom: 0, left: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                    <XAxis dataKey="label" tick={{ fill: '#6b7280', fontSize: 11 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: '#6b7280', fontSize: 11 }} axisLine={false} tickLine={false} />
                    <Tooltip content={<MetricTooltip />} />
                    <Legend wrapperStyle={{ color: '#9ca3af', fontSize: '11px' }} />
                    <Line type="monotone" dataKey="priceIndex" stroke="#FF6B35" strokeWidth={2.5} dot={false} />
                    <Line type="monotone" dataKey="transactions" stroke="#4ECDC4" strokeWidth={2.2} dot={false} />
                    <Line type="monotone" dataKey="liquidityPct" stroke="#96CEB4" strokeWidth={2.2} dot={false} />
                    <Line type="monotone" dataKey="freezePct" stroke="#FFEAA7" strokeWidth={2.2} dot={false} />
                  </RechartsLineChart>
                </ResponsiveContainer>
              </div>
              <div className="space-y-4">
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <p className="text-[11px] uppercase tracking-[0.24em] text-gray-500">Run summary</p>
                  <div className="mt-3 space-y-3 text-sm text-gray-300">
                    <div className="flex items-center justify-between gap-3"><span>Market regime</span><span className="font-semibold text-white">{summary.regime}</span></div>
                    <div className="flex items-center justify-between gap-3"><span>Scenario type</span><span className="font-semibold text-white">{currentScenario.type}</span></div>
                    <div className="flex items-center justify-between gap-3"><span>Agent scale</span><span className="font-semibold text-white">{agentScale}</span></div>
                    <div className="flex items-center justify-between gap-3"><span>Timeline</span><span className="font-semibold text-white">{months} months</span></div>
                  </div>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <p className="text-[11px] uppercase tracking-[0.24em] text-gray-500">Regional leaders</p>
                  <div className="mt-3 space-y-2">
                    {summary.topRegions.map((region) => (
                      <div key={region.region} className="flex items-center justify-between gap-3 rounded-xl border border-white/5 bg-black/20 px-3 py-2 text-sm">
                        <div className="min-w-0">
                          <p className="truncate font-semibold text-white">{region.region}</p>
                          <p className="text-xs text-gray-500">{region.status}</p>
                        </div>
                        <div className="text-right text-xs text-gray-300">
                          <p>{currency(region.priceIndex)}</p>
                          <p className="text-[#4ECDC4]">{percent(region.growth, 1)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </SectionShell>
        </section>

        <section className="grid gap-8 xl:grid-cols-2">
          <SectionShell eyebrow="Engine Registry" title="Data, models, and agents" description="This section exposes the imported project surface so the integration remains explicit, auditable, and professional.">
            <div className="grid gap-4 lg:grid-cols-2">
              <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                <div className="mb-3 flex items-center gap-2 text-[#FFB38F]"><Database size={16} /><p className="text-xs uppercase tracking-[0.24em]">Data sources</p></div>
                <div className="space-y-2">
                  {catalogData.data_sources.map((item) => <div key={item.name} className="rounded-xl border border-white/5 bg-white/5 p-3"><p className="text-sm font-semibold text-white">{item.name}</p><p className="text-xs text-gray-500">{item.layer}</p><p className="mt-1 text-xs leading-5 text-gray-400">{item.purpose}</p></div>)}
                </div>
              </div>
              <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                <div className="mb-3 flex items-center gap-2 text-[#FFB38F]"><Cpu size={16} /><p className="text-xs uppercase tracking-[0.24em]">Model registry</p></div>
                <div className="space-y-2">
                  {catalogData.models.map((item) => <div key={item.name} className="rounded-xl border border-white/5 bg-white/5 p-3"><p className="text-sm font-semibold text-white">{item.name}</p><p className="text-xs text-gray-500">{item.role}</p><p className="mt-1 text-xs leading-5 text-gray-400">{item.detail}</p></div>)}
                </div>
              </div>
              <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                <div className="mb-3 flex items-center gap-2 text-[#FFB38F]"><Users size={16} /><p className="text-xs uppercase tracking-[0.24em]">Agent classes</p></div>
                <div className="space-y-2">
                  {catalogData.agents.map((agent) => <div key={agent.type} className="rounded-xl border border-white/5 bg-white/5 p-3"><p className="text-sm font-semibold text-white">{agent.type}</p><p className="mt-1 text-xs leading-5 text-gray-400">{agent.behavior}</p><p className="mt-2 text-[11px] uppercase tracking-[0.2em] text-gray-500">{agent.decisionFocus}</p></div>)}
                </div>
              </div>
              <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                <div className="mb-3 flex items-center gap-2 text-[#FFB38F]"><Workflow size={16} /><p className="text-xs uppercase tracking-[0.24em]">Execution workflow</p></div>
                <div className="space-y-2">
                  {catalogData.workflow.map((step, index) => <div key={step} className="flex items-center gap-3 rounded-xl border border-white/5 bg-white/5 p-3"><div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#FF6B35]/10 text-xs font-bold text-[#FFB38F]">{index + 1}</div><p className="text-sm text-gray-200">{step}</p></div>)}
                </div>
              </div>
            </div>
          </SectionShell>

          <SectionShell eyebrow="Scenario Library" title="Built-in worlds" description="These are the canonical worlds from the imported simulator catalog. Each one shifts demand, supply, sentiment, capital, and regulatory tension differently.">
            <div className="grid gap-4 md:grid-cols-2">
              {catalogData.scenarios.map((item) => (
                <div key={item.name} className="rounded-2xl border border-white/10 bg-black/20 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-bold text-white">{item.name.replaceAll('_', ' ')}</p>
                      <p className="text-xs uppercase tracking-[0.24em] text-gray-500">{item.type}</p>
                    </div>
                    <Pill tone={item.type === 'stress' ? 'orange' : item.type === 'reference' ? 'blue' : 'green'}>{item.type}</Pill>
                  </div>
                  <p className="mt-3 text-sm leading-6 text-gray-400">{item.description}</p>
                  <div className="mt-4 grid grid-cols-2 gap-2 text-xs text-gray-300">
                    <div className="rounded-xl border border-white/5 bg-white/5 p-2">Demand {fmt(item.demand * 100, 0)}%</div>
                    <div className="rounded-xl border border-white/5 bg-white/5 p-2">Supply {fmt(item.supply * 100, 0)}%</div>
                    <div className="rounded-xl border border-white/5 bg-white/5 p-2">Sentiment {fmt(item.sentiment * 100, 0)}%</div>
                    <div className="rounded-xl border border-white/5 bg-white/5 p-2">LTV {fmt(item.ltv * 100, 0)}%</div>
                  </div>
                </div>
              ))}
            </div>
          </SectionShell>
        </section>

        <section className="grid gap-8 xl:grid-cols-[1.1fr_0.9fr]">
          <SectionShell eyebrow="Regional Outcomes" title="Top market signals" description="The ranking shows the most resilient or fastest-growing regions in the current simulation preview.">
            <div className="overflow-hidden rounded-2xl border border-white/10">
              <table className="w-full text-left text-sm">
                <thead className="bg-white/5 text-[11px] uppercase tracking-[0.24em] text-gray-500">
                  <tr>
                    <th className="px-4 py-3">Region</th>
                    <th className="px-4 py-3">Price</th>
                    <th className="px-4 py-3">Growth</th>
                    <th className="px-4 py-3">Liquidity</th>
                    <th className="px-4 py-3">Risk</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 bg-black/20">
                  {summary.topRegions.map((region) => (
                    <tr key={region.region} className="hover:bg-white/5">
                      <td className="px-4 py-3"><div className="flex items-center gap-2"><MapPin size={12} className="text-gray-500" /><div><p className="font-semibold text-white">{region.region}</p><p className="text-xs text-gray-500">{region.status}</p></div></div></td>
                      <td className="px-4 py-3 text-[#FFB38F]">{currency(region.priceIndex)}</td>
                      <td className="px-4 py-3 text-[#4ECDC4]">{percent(region.growth, 1)}</td>
                      <td className="px-4 py-3 text-[#96CEB4]">{fmt(region.liquidity * 100, 1)}%</td>
                      <td className="px-4 py-3 text-[#FFEAA7]">{fmt(region.risk * 100, 1)}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="mt-5 grid gap-4 md:grid-cols-3">
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4"><p className="text-xs uppercase tracking-[0.24em] text-gray-500">Model coverage</p><p className="mt-2 text-xl font-black text-white">{catalogData.models.length} entities</p></div>
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4"><p className="text-xs uppercase tracking-[0.24em] text-gray-500">Workflow depth</p><p className="mt-2 text-xl font-black text-white">{catalogData.workflow.length} stages</p></div>
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4"><p className="text-xs uppercase tracking-[0.24em] text-gray-500">Artifacts</p><p className="mt-2 text-xl font-black text-white">{catalogData.outputs.length} outputs</p></div>
            </div>
          </SectionShell>

          <SectionShell eyebrow="Output Layer" title="Reports and exports" description="This module is designed to align with the backend analytics pipeline: run, score, compare, interpret, and export.">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-2xl border border-white/10 bg-black/20 p-4"><div className="mb-3 flex items-center gap-2 text-[#FFB38F]"><FileText size={16} /><p className="text-xs uppercase tracking-[0.24em]">Narrative output</p></div><p className="text-sm leading-6 text-gray-400">A report package can summarize the scenario, interpretation, risks, opportunities, and policy implications for decision makers.</p></div>
              <div className="rounded-2xl border border-white/10 bg-black/20 p-4"><div className="mb-3 flex items-center gap-2 text-[#FFB38F]"><Download size={16} /><p className="text-xs uppercase tracking-[0.24em]">Export bundle</p></div><p className="text-sm leading-6 text-gray-400">Exports are structured for downstream dashboards and archival audit: JSON, CSV, Markdown, PDF, and manifest files.</p></div>
            </div>
            <div className="mt-4 rounded-2xl border border-white/10 bg-white/5 p-4">
              <p className="text-xs uppercase tracking-[0.24em] text-gray-500">Expected artifacts</p>
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                {catalogData.outputs.map((artifact) => <div key={artifact} className="flex items-center gap-2 rounded-xl border border-white/5 bg-black/20 px-3 py-2 text-sm text-gray-200"><CheckCircle2 size={13} className="text-emerald-300" /><span>{artifact}</span></div>)}
              </div>
            </div>
          </SectionShell>
        </section>

        <section className="rounded-[28px] border border-white/10 bg-[#101726]/90 p-6 shadow-[0_30px_120px_rgba(0,0,0,0.24)] backdrop-blur">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="flex items-center gap-2 text-[#FFB38F]"><Globe2 size={16} /><span className="text-xs uppercase tracking-[0.28em]">Simulation integration</span></div>
              <h3 className="mt-2 text-2xl font-black text-white">Built to feel like a production module</h3>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-gray-400">The page now covers the complete imported system at the product level: data, models, agents, scenarios, workflow, outputs, and a live scenario preview. It is intentionally explicit so the integration remains understandable and maintainable.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={handleRun} className="inline-flex items-center gap-2 rounded-xl bg-[#FF6B35] px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-[#FF6B35]/20"><PlayCircle size={14} /> Run again</button>
              <button type="button" onClick={handleUpgrade} className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-gray-200 transition hover:border-white/20 hover:bg-white/10"><Layers3 size={14} /> Upgrade plan</button>
            </div>
          </div>
          <div className="mt-6 grid gap-4 md:grid-cols-4">
            <StatCard label="Current plan" value={(user?.plan || 'free').toUpperCase()} sub="Kept in sync with EstateMind auth" icon={Workflow} color="#4ECDC4" />
            <StatCard label="Scenario fidelity" value="High" sub="Backend preview + local deterministic fallback" icon={Sparkles} color="#96CEB4" />
            <StatCard label="Auditability" value="Full" sub="Explicit model and data registry" icon={Shield} color="#FFEAA7" />
            <StatCard label="Responsiveness" value="Instant" sub="Preview updates as controls change" icon={BarChart3} color="#FF6B35" />
          </div>
        </section>
      </div>
    </main>
  );
}
