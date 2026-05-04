/**
 * AnalyzePage — Market Intelligence Hub
 * Tab 1: 12-month AI price forecasts (Jan–Dec 2026, 277 delegations)
 * Tab 2: Market Dashboard — comprehensive real estate analytics
 */
import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  ScatterChart, Scatter, RadarChart, Radar, PolarGrid, PolarAngleAxis,
  XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend,
} from 'recharts';
import {
  AlertTriangle, BarChart3, LayoutDashboard, Building2, Loader2,
  TrendingUp, TrendingDown, Minus, MapPin, Globe, ChevronRight,
  ChevronUp, ChevronDown, Info, Search, ArrowUpDown,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import {
  getClimateDashboard,
  getForecastGovernorateList,
  getForecastDelegationList,
  getForecastGovernorate,
  getForecastDelegation,
  getForecastNational,
} from '../services/api';

const ORANGE = '#FF6B35';
const CARD   = 'rounded-2xl border border-white/10 bg-white/5 p-6';
const SEL_CLS =
  'w-full rounded-xl border border-white/15 bg-black/30 px-3 py-2.5 text-sm text-white ' +
  'focus:border-[#FF6B35]/60 focus:outline-none focus:ring-1 focus:ring-[#FF6B35]/30 ' +
  'transition-colors cursor-pointer';

const CHART_COLORS = [
  '#FF6B35','#4ECDC4','#45B7D1','#96CEB4','#FFEAA7',
  '#DDA0DD','#85C1E9','#F0B27A','#82E0AA','#AED6F1',
  '#F1948A','#A9CCE3',
];

const RISK_COLORS = {
  'Low':      '#96CEB4',
  'Moderate': '#FFEAA7',
  'High':     '#FF6B35',
  'Very High':'#EF4444',
  'Unknown':  '#6b7280',
};

const fmt = (n) => (n ?? 0).toLocaleString('fr-TN', { maximumFractionDigits: 0 });

// ── Shared atoms ───────────────────────────────────────────────────────────────
function TrendBadge({ growth }) {
  if (growth >= 2)
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-green-500/30 bg-green-500/15 px-2.5 py-1 text-xs font-semibold text-green-400">
        <TrendingUp size={11} /> +{growth}%
      </span>
    );
  if (growth <= -2)
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-red-500/30 bg-red-500/15 px-2.5 py-1 text-xs font-semibold text-red-400">
        <TrendingDown size={11} /> {growth}%
      </span>
    );
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-gray-500/30 bg-gray-500/15 px-2.5 py-1 text-xs font-semibold text-gray-400">
      <Minus size={11} /> {growth > 0 ? '+' : ''}{growth}%
    </span>
  );
}

function MetricCard({ label, value, sub, highlight }) {
  return (
    <div className={`rounded-xl border p-4 text-center ${
      highlight ? 'border-[#FF6B35]/30 bg-[#FF6B35]/5' : 'border-white/10 bg-white/5'
    }`}>
      <p className="text-xs uppercase tracking-wider text-gray-500 mb-1">{label}</p>
      <p className={`text-2xl font-black ${highlight ? 'text-[#FF6B35]' : 'text-white'}`}>{value}</p>
      {sub && <p className="text-xs text-gray-500 mt-0.5">{sub}</p>}
    </div>
  );
}

function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  const d = payload[0]?.payload;
  return (
    <div className="rounded-xl border border-white/20 bg-[#111827] px-4 py-3 shadow-2xl text-xs">
      <p className="font-bold text-white mb-1.5">{label}</p>
      <p className="text-[#FF6B35]">Forecast: <strong>{fmt(d?.price_per_m2)} TND/m²</strong></p>
      <p className="text-gray-500 mt-0.5">Range: {fmt(d?.lower)} – {fmt(d?.upper)} TND/m²</p>
    </div>
  );
}

function DashTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-white/20 bg-[#111827] px-4 py-3 shadow-2xl text-xs space-y-1">
      <p className="font-bold text-white mb-1">{label}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.color || p.fill }}>
          {p.name}: <strong>{typeof p.value === 'number'
            ? p.value.toLocaleString('fr-TN', { maximumFractionDigits: 1 })
            : p.value}</strong>
        </p>
      ))}
    </div>
  );
}

function ScatterTip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const d = payload[0]?.payload;
  if (!d) return null;
  return (
    <div className="rounded-xl border border-white/20 bg-[#111827] px-4 py-3 shadow-2xl text-xs space-y-1">
      <p className="font-bold text-white">{d.governorate}</p>
      <p className="text-[#FF6B35]">Price: <strong>{fmt(d.price_jan_tnd)} TND/m²</strong></p>
      <p className="text-[#4ECDC4]">Growth: <strong>{d.growth_pct_12m > 0 ? '+' : ''}{d.growth_pct_12m}%</strong></p>
      {d.livability_score != null && <p className="text-gray-400">Livability: <strong>{d.livability_score}/100</strong></p>}
    </div>
  );
}

function KpiCard({ label, value, sub, color = ORANGE, icon: Icon }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-5 flex flex-col gap-2">
      {Icon && (
        <div className="w-9 h-9 rounded-xl flex items-center justify-center mb-1"
          style={{ background: `${color}20`, border: `1px solid ${color}30` }}>
          <Icon size={16} style={{ color }} />
        </div>
      )}
      <p className="text-xs uppercase tracking-widest text-gray-500">{label}</p>
      <p className="text-xl font-black text-white leading-tight">{value}</p>
      {sub && <p className="text-xs text-gray-500">{sub}</p>}
    </div>
  );
}

function RiskBadge({ category }) {
  const map = {
    'Low':      'bg-green-500/15 border-green-500/30 text-green-400',
    'Moderate': 'bg-yellow-500/15 border-yellow-500/30 text-yellow-400',
    'High':     'bg-orange-500/15 border-orange-500/30 text-orange-400',
    'Very High':'bg-red-500/15 border-red-500/30 text-red-400',
  };
  return (
    <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-semibold border ${
      map[category] || 'bg-gray-500/15 border-gray-500/30 text-gray-400'
    }`}>
      {category || '—'}
    </span>
  );
}

function SortTh({ label, col, active, dir, onClick }) {
  return (
    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 cursor-pointer select-none hover:text-white transition-colors"
      onClick={onClick}>
      <span className="flex items-center gap-1">
        {label}
        {active
          ? (dir === 'asc' ? <ChevronUp size={12} className="text-[#FF6B35]" /> : <ChevronDown size={12} className="text-[#FF6B35]" />)
          : <ArrowUpDown size={12} className="text-gray-600" />}
      </span>
    </th>
  );
}

// ── Price Forecast section ────────────────────────────────────────────────────
function PriceForecastSection() {
  const [governorates, setGovernorates] = useState([]);
  const [delegations,  setDelegations]  = useState([]);
  const [selGov,  setSelGov]  = useState('');
  const [selDel,  setSelDel]  = useState('');
  const [viewMode, setViewMode] = useState('national');

  const [nationalData, setNationalData] = useState(null);
  const [forecastData, setForecastData] = useState(null);
  const [loading, setLoading]  = useState(false);
  const [error,   setError]    = useState('');

  useEffect(() => {
    getForecastGovernorateList()
      .then(r => setGovernorates(r.data.governorates || []))
      .catch(() => {});

    setLoading(true);
    getForecastNational()
      .then(r => setNationalData(r.data))
      .catch(() => setError('Could not load forecast data.'))
      .finally(() => setLoading(false));
  }, []);

  const handleGovChange = useCallback(async (gov) => {
    setSelGov(gov);
    setSelDel('');
    setDelegations([]);
    setForecastData(null);
    setError('');
    if (!gov) { setViewMode('national'); return; }
    setViewMode('governorate');
    setLoading(true);
    try {
      const [govRes, delRes] = await Promise.all([
        getForecastGovernorate(gov),
        getForecastDelegationList(gov),
      ]);
      setForecastData(govRes.data);
      setDelegations(delRes.data.delegations || []);
    } catch {
      setError(`No forecast data available for ${gov}.`);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleDelChange = useCallback(async (del) => {
    setSelDel(del);
    setError('');
    if (!del) { handleGovChange(selGov); return; }
    setViewMode('delegation');
    setLoading(true);
    try {
      const res = await getForecastDelegation(del);
      setForecastData(res.data);
    } catch {
      setError(`No forecast data available for ${del}.`);
    } finally {
      setLoading(false);
    }
  }, [selGov, handleGovChange]);

  const summary   = forecastData?.summary;
  const months    = forecastData?.months || [];
  const chartData = months.map(m => ({
    month_label:  m.month_label,
    price_per_m2: m.price_per_m2,
    lower:        m.lower,
    upper:        m.upper,
  }));

  const isGovAvg = viewMode === 'governorate';

  return (
    <section className="space-y-6">
      <div>
        <div className="inline-flex items-center gap-2 rounded-full border border-[#FF6B35]/30 bg-[#FF6B35]/10 px-3 py-1.5 text-xs font-semibold text-[#FFB38F] mb-3">
          <BarChart3 size={13} /> AI Price Forecast · 277 Locations · 2026
        </div>
        <h2 className="text-3xl font-black text-white">12-Month Price Forecast</h2>
        <p className="mt-1.5 text-gray-400 max-w-2xl">
          Predicted property prices for every delegation in Tunisia, Jan–Dec 2026.
          Select a governorate, then a specific neighbourhood to see precise pricing.
        </p>
      </div>

      <div className={CARD}>
        <p className="text-xs uppercase tracking-widest text-gray-500 mb-4">Filter by Location</p>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="text-xs font-semibold uppercase tracking-widest text-gray-400 block mb-1.5">
              Governorate
            </label>
            <select className={SEL_CLS} value={selGov}
              onChange={e => handleGovChange(e.target.value)}>
              <option value="">— National overview —</option>
              {governorates.map(g => <option key={g} value={g}>{g}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-semibold uppercase tracking-widest text-gray-400 block mb-1.5">
              Neighbourhood (Delegation)
            </label>
            <select className={SEL_CLS} value={selDel}
              onChange={e => handleDelChange(e.target.value)}
              disabled={!selGov || delegations.length === 0}>
              <option value="">— Governorate average —</option>
              {delegations.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>
        </div>

        {selGov && (
          <p className="mt-3 text-xs text-gray-500 flex items-center gap-1">
            <Globe size={11} /> Viewing: <span className="text-white font-medium ml-1">{selGov}</span>
            {selDel && <><ChevronRight size={11} /><span className="text-[#FF6B35] font-medium">{selDel}</span></>}
            {isGovAvg && !selDel && <span className="ml-1 text-gray-600">· average across all delegations</span>}
          </p>
        )}
      </div>

      {loading && (
        <div className="flex items-center justify-center py-10 gap-3 text-gray-400">
          <Loader2 size={20} className="animate-spin" />
          <span className="text-sm">Loading forecast data…</span>
        </div>
      )}
      {!loading && error && (
        <div className="flex items-center gap-3 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          <AlertTriangle size={15} className="flex-shrink-0" />{error}
        </div>
      )}

      {!loading && !error && forecastData && months.length > 0 && (
        <div className="space-y-5">
          {isGovAvg && (
            <div className="flex items-start gap-2 rounded-xl border border-blue-500/20 bg-blue-500/5 px-4 py-3 text-xs text-blue-300">
              <Info size={14} className="flex-shrink-0 mt-0.5" />
              <span>
                Showing the <strong>average</strong> across all {forecastData.delegation_count} delegations in {selGov}.
                For precise neighbourhood pricing, select a delegation above.
              </span>
            </div>
          )}

          <div className="grid grid-cols-3 gap-4">
            <MetricCard
              label={isGovAvg ? 'Jan 2026 — Avg.' : 'Jan 2026'}
              value={`${fmt(summary?.current_price_per_m2)} TND/m²`}
              sub="Forecast start"
            />
            <MetricCard
              label={isGovAvg ? 'Jun 2026 — Avg.' : 'Jun 2026'}
              value={`${fmt(summary?.price_6m)} TND/m²`}
              sub={summary?.growth_pct_6m != null
                ? `${summary.growth_pct_6m > 0 ? '+' : ''}${summary.growth_pct_6m}% vs Jan`
                : ''}
            />
            <MetricCard
              label={isGovAvg ? 'Dec 2026 — Avg.' : 'Dec 2026'}
              value={`${fmt(summary?.price_12m)} TND/m²`}
              sub={summary?.growth_pct_12m != null
                ? `${summary.growth_pct_12m > 0 ? '+' : ''}${summary.growth_pct_12m}% vs Jan`
                : ''}
              highlight
            />
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            <TrendBadge growth={summary?.growth_pct_12m ?? 0} />
            <span className="text-xs text-gray-500">Shaded area = forecast confidence range</span>
          </div>

          <div className={CARD}>
            <p className="text-xs uppercase tracking-widest text-gray-500 mb-5">
              Price per m² — Jan to Dec 2026
              {isGovAvg && <span className="ml-2 text-gray-600 normal-case">(avg. across delegations)</span>}
            </p>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={chartData} margin={{ left: 10, right: 10, top: 10, bottom: 0 }}>
                <defs>
                  <linearGradient id="priceGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor={ORANGE} stopOpacity={0.35} />
                    <stop offset="95%" stopColor={ORANGE} stopOpacity={0.02} />
                  </linearGradient>
                  <linearGradient id="bandGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor={ORANGE} stopOpacity={0.1} />
                    <stop offset="95%" stopColor={ORANGE} stopOpacity={0.01} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                <XAxis dataKey="month_label" tick={{ fill: '#6b7280', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#6b7280', fontSize: 11 }} axisLine={false} tickLine={false}
                  tickFormatter={v => `${(v / 1000).toFixed(0)}k`} />
                <Tooltip content={<ChartTooltip />} />
                <Area type="monotone" dataKey="upper" stroke="none" fill="url(#bandGrad)" fillOpacity={1} />
                <Area type="monotone" dataKey="lower" stroke="none" fill="white"           fillOpacity={0} />
                <Area type="monotone" dataKey="price_per_m2"
                  stroke={ORANGE} strokeWidth={2.5} fill="url(#priceGrad)" fillOpacity={1}
                  dot={false} activeDot={{ r: 5, fill: ORANGE }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {forecastData.top_delegations?.length > 0 && (
            <div className={CARD}>
              <p className="text-xs uppercase tracking-widest text-gray-500 mb-1">Top Delegations by Growth</p>
              <p className="text-xs text-gray-600 mb-4">Click any to see its individual price trajectory</p>
              <div className="space-y-2">
                {forecastData.top_delegations.map((d, i) => (
                  <button key={d.delegation} type="button"
                    onClick={() => handleDelChange(d.delegation)}
                    className="w-full flex items-center gap-3 rounded-xl border border-white/5 bg-white/3 px-4 py-2.5 hover:border-[#FF6B35]/20 hover:bg-[#FF6B35]/5 transition-all text-left">
                    <span className="text-xs text-gray-600 w-5 text-right">#{i + 1}</span>
                    <span className="flex-1 text-sm text-white font-medium">{d.delegation}</span>
                    <span className="text-xs text-gray-400 hidden sm:block">{fmt(d.price_jan_tnd)} TND/m²</span>
                    <TrendBadge growth={d.growth_pct_12m} />
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {!loading && !error && viewMode === 'national' && nationalData && (
        <div className="space-y-5">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <MetricCard label="Governorates"  value={nationalData.total_governorates} sub="All 24 Tunisian wilayas" />
            <MetricCard label="Delegations"   value={nationalData.total_delegations}  sub="Individual forecasts" />
            <MetricCard label="Horizon"       value="12 months" sub="Jan–Dec 2026" />
            <MetricCard label="AI Accuracy"   value="~97%" sub="Average forecast precision" highlight />
          </div>

          <div className={CARD}>
            <p className="text-xs uppercase tracking-widest text-gray-500 mb-1">
              Top 10 Neighbourhoods — Highest Projected Growth
            </p>
            <p className="text-xs text-gray-600 mb-4">
              These are the delegations with the strongest price growth forecast for 2026.
              Click any to view its full price trajectory.
            </p>
            <div className="space-y-2">
              {(nationalData.top_delegations || []).map((d, i) => (
                <button key={d.delegation} type="button"
                  onClick={async () => {
                    await handleGovChange(d.governorate);
                    handleDelChange(d.delegation);
                  }}
                  className="w-full flex items-center gap-3 rounded-xl border border-white/5 bg-white/3 px-4 py-2.5 hover:border-[#FF6B35]/20 hover:bg-[#FF6B35]/5 transition-all text-left group">
                  <span className="text-xs text-gray-600 w-5 text-right">#{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-white group-hover:text-[#FF6B35] transition-colors truncate">
                      {d.delegation}
                    </p>
                    <p className="text-xs text-gray-500">{d.governorate}</p>
                  </div>
                  <span className="text-xs text-gray-400 hidden sm:block">
                    {fmt(d.price_jan_tnd)} TND/m²
                  </span>
                  <TrendBadge growth={d.growth_pct_12m} />
                  <ChevronRight size={13} className="text-gray-600 group-hover:text-[#FF6B35] transition-colors" />
                </button>
              ))}
            </div>
          </div>

          <div className={CARD}>
            <p className="text-xs uppercase tracking-widest text-gray-500 mb-1">Overview by Governorate</p>
            <p className="text-xs text-gray-600 mb-4">
              Governorate figures are averages across all their delegations — prices vary significantly between neighbourhoods.
            </p>
            <div className="space-y-2">
              {(nationalData.top_governorates || []).map((g, i) => (
                <button key={g.governorate} type="button"
                  onClick={() => handleGovChange(g.governorate)}
                  className="w-full flex items-center gap-3 rounded-xl border border-white/5 bg-white/3 px-4 py-2.5 hover:border-[#FF6B35]/20 hover:bg-[#FF6B35]/5 transition-all text-left group">
                  <span className="text-xs text-gray-600 w-5 text-right">#{i + 1}</span>
                  <span className="flex-1 text-sm font-semibold text-white group-hover:text-[#FF6B35] transition-colors">
                    {g.governorate}
                  </span>
                  <span className="text-xs text-gray-500 hidden md:block">
                    avg. {fmt(g.price_jan_tnd)} → {fmt(g.price_dec_tnd)} TND/m²
                  </span>
                  <TrendBadge growth={g.growth_pct_12m} />
                  <ChevronRight size={13} className="text-gray-600 group-hover:text-[#FF6B35] transition-colors" />
                </button>
              ))}
            </div>
            <p className="mt-3 text-xs text-gray-600 flex items-center gap-1">
              <Info size={11} /> Click any governorate to explore its delegations and see neighbourhood-level pricing.
            </p>
          </div>
        </div>
      )}

      {!loading && !error && viewMode === 'national' && !nationalData && (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <BarChart3 size={52} className="text-gray-700 mb-4" />
          <p className="text-white font-semibold text-lg">No forecast data available</p>
          <p className="text-sm text-gray-500 mt-2">
            Run <code className="text-[#FFB38F]">python manage.py import_price_forecasts</code> to seed the database.
          </p>
        </div>
      )}
    </section>
  );
}

// ── Market Dashboard section ───────────────────────────────────────────────────
function DashboardSection() {
  const [nationalData, setNationalData] = useState(null);
  const [climateData,  setClimateData]  = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [error,        setError]        = useState('');
  const [search,       setSearch]       = useState('');
  const [sortKey,      setSortKey]      = useState('price_jan_tnd');
  const [sortDir,      setSortDir]      = useState('desc');

  useEffect(() => {
    setLoading(true);
    Promise.allSettled([
      getForecastNational(),
      getClimateDashboard(),
    ]).then(([forecastRes, climateRes]) => {
      if (forecastRes.status === 'fulfilled') setNationalData(forecastRes.value.data);
      if (climateRes.status  === 'fulfilled') setClimateData(climateRes.value.data.results || []);
      if (forecastRes.status === 'rejected' && climateRes.status === 'rejected')
        setError('Unable to load market data.');
    }).finally(() => setLoading(false));
  }, []);

  const mergedGovData = useMemo(() => {
    const govs = nationalData?.top_governorates || [];
    return govs.map(g => {
      const c = climateData.find(r => r.governorate?.toLowerCase() === g.governorate?.toLowerCase());
      return {
        ...g,
        livability_score:     c?.livability_score     ?? null,
        sustainability_score: c?.sustainability_score  ?? null,
        combined_risk_score:  c?.combined_risk_score   ?? null,
        risk_category:        c?.risk_category         ?? 'Unknown',
      };
    });
  }, [nationalData, climateData]);

  const kpis = useMemo(() => {
    if (!nationalData) return null;
    const govs = mergedGovData;
    const dels = nationalData.top_delegations || [];
    const avgPrice = govs.length
      ? Math.round(govs.reduce((s, g) => s + (g.price_jan_tnd || 0), 0) / govs.length)
      : 0;
    const highest  = [...govs].sort((a, b) => (b.price_jan_tnd || 0) - (a.price_jan_tnd || 0))[0] || {};
    const fastest  = [...dels].sort((a, b) => (b.growth_pct_12m || 0) - (a.growth_pct_12m || 0))[0] || {};
    const avgLiv   = climateData.length
      ? Math.round(climateData.reduce((s, c) => s + (c.livability_score || 0), 0) / climateData.length)
      : null;
    return {
      totalGovs:    nationalData.total_governorates || govs.length,
      totalDels:    nationalData.total_delegations,
      avgPrice,
      highestName:  highest.governorate || '—',
      highestPrice: highest.price_jan_tnd,
      fastestName:  fastest.delegation  || '—',
      fastestGov:   fastest.governorate || '',
      fastestGrowth:fastest.growth_pct_12m,
      avgLiv,
    };
  }, [nationalData, mergedGovData, climateData]);

  const priceTiers = useMemo(() => {
    let premium = 0, mid = 0, affordable = 0;
    mergedGovData.forEach(g => {
      if ((g.price_jan_tnd || 0) >= 2500)      premium++;
      else if ((g.price_jan_tnd || 0) >= 1500)  mid++;
      else                                        affordable++;
    });
    return [
      { name: 'Premium (≥2,500 TND/m²)', value: premium,    color: '#FF6B35' },
      { name: 'Mid-Range (1,500–2,500)',  value: mid,        color: '#4ECDC4' },
      { name: 'Affordable (<1,500)',       value: affordable, color: '#96CEB4' },
    ].filter(t => t.value > 0);
  }, [mergedGovData]);

  const riskTiers = useMemo(() => {
    const cats = {};
    climateData.forEach(c => { const cat = c.risk_category || 'Unknown'; cats[cat] = (cats[cat] || 0) + 1; });
    return Object.entries(cats)
      .map(([name, value]) => ({ name, value, color: RISK_COLORS[name] || '#6b7280' }))
      .sort((a, b) => b.value - a.value);
  }, [climateData]);

  const radarChartData = useMemo(() => {
    const top5 = mergedGovData.filter(g => g.livability_score).slice(0, 5);
    if (top5.length < 2) return { top5: [], data: [] };
    const maxPrice  = Math.max(...mergedGovData.map(g => g.price_jan_tnd || 0)) || 1;
    const maxGrowth = Math.max(...mergedGovData.map(g => Math.abs(g.growth_pct_12m || 0))) || 1;
    const metrics = [
      { subject: 'Price Level',    key: 'price_jan_tnd',      max: maxPrice  },
      { subject: 'Growth Trend',   key: 'growth_pct_12m',     max: maxGrowth },
      { subject: 'Livability',     key: 'livability_score',   max: 100       },
      { subject: 'Sustainability', key: 'sustainability_score', max: 100     },
    ];
    const data = metrics.map(m => {
      const row = { subject: m.subject };
      top5.forEach(g => { row[g.governorate] = Math.round(Math.max(0, (g[m.key] || 0)) / m.max * 100); });
      return row;
    });
    return { top5, data };
  }, [mergedGovData]);

  const top12Price = useMemo(() =>
    [...mergedGovData].sort((a, b) => (b.price_jan_tnd || 0) - (a.price_jan_tnd || 0)).slice(0, 12),
    [mergedGovData]);

  const top10Growth = useMemo(() =>
    (nationalData?.top_delegations || []).slice(0, 10),
    [nationalData]);

  const top12Livability = useMemo(() =>
    [...mergedGovData].filter(g => g.livability_score).sort((a, b) => (b.livability_score || 0) - (a.livability_score || 0)).slice(0, 10),
    [mergedGovData]);

  const tableData = useMemo(() => {
    const filtered = mergedGovData.filter(g =>
      !search || g.governorate?.toLowerCase().includes(search.toLowerCase())
    );
    return [...filtered].sort((a, b) => {
      const av = a[sortKey] ?? (sortDir === 'asc' ? Infinity : -Infinity);
      const bv = b[sortKey] ?? (sortDir === 'asc' ? Infinity : -Infinity);
      return sortDir === 'asc' ? av - bv : bv - av;
    });
  }, [mergedGovData, search, sortKey, sortDir]);

  const handleSort = (key) => {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir('desc'); }
  };

  if (loading) return (
    <div className="flex items-center justify-center py-24 gap-3 text-gray-400">
      <Loader2 size={24} className="animate-spin" />
      <span className="text-sm">Loading market dashboard…</span>
    </div>
  );

  if (error) return (
    <div className="flex items-center gap-3 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
      <AlertTriangle size={15} />{error}
    </div>
  );

  return (
    <section className="space-y-8">

      {/* Header */}
      <div>
        <div className="inline-flex items-center gap-2 rounded-full border border-[#FF6B35]/30 bg-[#FF6B35]/10 px-3 py-1.5 text-xs font-semibold text-[#FFB38F] mb-3">
          <LayoutDashboard size={13} /> Live Market Data · All Governorates · 2026
        </div>
        <h2 className="text-3xl font-black text-white">Market Dashboard</h2>
        <p className="mt-1.5 text-gray-400 max-w-2xl">
          Comprehensive overview of Tunisian real estate — prices, growth trends, and market activity across all regions.
        </p>
      </div>

      {/* KPI row */}
      {kpis && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiCard label="Regions Tracked"      value={kpis.totalGovs}
            sub="All Tunisian governorates" color="#4ECDC4" icon={Globe} />
          <KpiCard label="Avg. Market Price"    value={`${fmt(kpis.avgPrice)} TND/m²`}
            sub="National average, Jan 2026" color={ORANGE} icon={Building2} />
          <KpiCard label="Highest Priced Region" value={kpis.highestName}
            sub={kpis.highestPrice ? `${fmt(kpis.highestPrice)} TND/m²` : ''}
            color="#FFEAA7" icon={TrendingUp} />
          <KpiCard label="Fastest Growing Area" value={kpis.fastestName}
            sub={kpis.fastestGrowth != null ? `+${kpis.fastestGrowth}% · ${kpis.fastestGov}` : ''}
            color="#96CEB4" icon={TrendingUp} />
        </div>
      )}

      {/* Row 1: Horizontal price bar + pie charts */}
      <div className="grid lg:grid-cols-5 gap-6">

        {/* Price ranking horizontal bar */}
        <div className={CARD + ' lg:col-span-3'}>
          <p className="text-xs uppercase tracking-widest text-gray-500 mb-1">Price Ranking by Region</p>
          <p className="text-xs text-gray-600 mb-5">Average asking price per m² — Jan 2026</p>
          {top12Price.length > 0 ? (
            <ResponsiveContainer width="100%" height={380}>
              <BarChart data={top12Price} layout="vertical"
                margin={{ left: 0, right: 40, top: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" horizontal={false} />
                <XAxis type="number" tick={{ fill: '#6b7280', fontSize: 10 }} axisLine={false} tickLine={false}
                  tickFormatter={v => `${(v / 1000).toFixed(0)}k`} />
                <YAxis type="category" dataKey="governorate" tick={{ fill: '#9ca3af', fontSize: 11 }}
                  axisLine={false} tickLine={false} width={85} />
                <Tooltip content={<DashTooltip />} formatter={v => [`${fmt(v)} TND/m²`, 'Price']} />
                <Bar dataKey="price_jan_tnd" name="Price/m²" radius={[0, 6, 6, 0]} maxBarSize={22}>
                  {top12Price.map((entry, i) => (
                    <Cell key={entry.governorate} fill={CHART_COLORS[i % CHART_COLORS.length]} fillOpacity={0.85} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-64 text-gray-600 text-sm">No price data available</div>
          )}
        </div>

        {/* Right column: two donut pies */}
        <div className="lg:col-span-2 space-y-6">

          {/* Price tier donut */}
          <div className={CARD}>
            <p className="text-xs uppercase tracking-widest text-gray-500 mb-1">Price Tier Distribution</p>
            <p className="text-xs text-gray-600 mb-3">Regions by price segment</p>
            {priceTiers.length > 0 ? (
              <ResponsiveContainer width="100%" height={150}>
                <PieChart>
                  <Pie data={priceTiers} cx="50%" cy="50%"
                    innerRadius={42} outerRadius={65} dataKey="value" paddingAngle={3}>
                    {priceTiers.map(e => <Cell key={e.name} fill={e.color} />)}
                  </Pie>
                  <Tooltip content={({ active, payload }) => {
                    if (!active || !payload?.length) return null;
                    const p = payload[0];
                    return (
                      <div className="rounded-xl border border-white/20 bg-[#111827] px-3 py-2 text-xs">
                        <p style={{ color: p.payload.color }} className="font-bold">{p.name}</p>
                        <p className="text-white">{p.value} regions</p>
                      </div>
                    );
                  }} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-36 flex items-center justify-center text-gray-600 text-sm">No data</div>
            )}
            <div className="space-y-1.5 mt-1">
              {priceTiers.map(t => (
                <div key={t.name} className="flex items-center gap-2 text-xs">
                  <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: t.color }} />
                  <span className="text-gray-400 flex-1 truncate">{t.name}</span>
                  <span className="text-white font-semibold">{t.value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Market safety donut */}
          {riskTiers.length > 0 && (
            <div className={CARD}>
              <p className="text-xs uppercase tracking-widest text-gray-500 mb-1">Market Safety Index</p>
              <p className="text-xs text-gray-600 mb-3">Regions by environmental risk level</p>
              <ResponsiveContainer width="100%" height={140}>
                <PieChart>
                  <Pie data={riskTiers} cx="50%" cy="50%"
                    innerRadius={38} outerRadius={60} dataKey="value" paddingAngle={3}>
                    {riskTiers.map(e => <Cell key={e.name} fill={e.color} />)}
                  </Pie>
                  <Tooltip content={({ active, payload }) => {
                    if (!active || !payload?.length) return null;
                    const p = payload[0];
                    return (
                      <div className="rounded-xl border border-white/20 bg-[#111827] px-3 py-2 text-xs">
                        <p style={{ color: p.payload.color }} className="font-bold">{p.name} Risk</p>
                        <p className="text-white">{p.value} regions</p>
                      </div>
                    );
                  }} />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-1.5 mt-1">
                {riskTiers.map(t => (
                  <div key={t.name} className="flex items-center gap-2 text-xs">
                    <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: t.color }} />
                    <span className="text-gray-400 flex-1">{t.name} Risk</span>
                    <span className="text-white font-semibold">{t.value}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Row 2: Jan vs Dec comparison bar + Top growing delegations */}
      <div className="grid lg:grid-cols-2 gap-6">

        {/* Grouped bar: Jan vs Dec */}
        <div className={CARD}>
          <p className="text-xs uppercase tracking-widest text-gray-500 mb-1">Price Growth Outlook</p>
          <p className="text-xs text-gray-600 mb-5">Jan 2026 vs Dec 2026 — top regions</p>
          {top12Price.length > 0 ? (
            <ResponsiveContainer width="100%" height={330}>
              <BarChart data={top12Price.slice(0, 8)} layout="vertical"
                margin={{ left: 0, right: 40, top: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" horizontal={false} />
                <XAxis type="number" tick={{ fill: '#6b7280', fontSize: 10 }} axisLine={false} tickLine={false}
                  tickFormatter={v => `${(v / 1000).toFixed(0)}k`} />
                <YAxis type="category" dataKey="governorate" tick={{ fill: '#9ca3af', fontSize: 10 }}
                  axisLine={false} tickLine={false} width={85} />
                <Tooltip content={<DashTooltip />} formatter={(v, name) => [`${fmt(v)} TND/m²`, name]} />
                <Legend iconType="circle" iconSize={8}
                  wrapperStyle={{ fontSize: '11px', paddingTop: '12px' }}
                  formatter={v => <span style={{ color: '#9ca3af' }}>{v}</span>} />
                <Bar dataKey="price_jan_tnd" name="Jan 2026" fill="#4ECDC4" radius={[0, 4, 4, 0]} maxBarSize={13} />
                <Bar dataKey="price_dec_tnd" name="Dec 2026" fill="#FF6B35" radius={[0, 4, 4, 0]} maxBarSize={13} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-64 text-gray-600 text-sm">No data</div>
          )}
        </div>

        {/* Fastest growing delegations */}
        <div className={CARD}>
          <p className="text-xs uppercase tracking-widest text-gray-500 mb-1">Fastest Growing Neighbourhoods</p>
          <p className="text-xs text-gray-600 mb-5">Top 10 by projected 12-month price growth</p>
          {top10Growth.length > 0 ? (
            <ResponsiveContainer width="100%" height={330}>
              <BarChart data={top10Growth} layout="vertical"
                margin={{ left: 0, right: 50, top: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" horizontal={false} />
                <XAxis type="number" tick={{ fill: '#6b7280', fontSize: 10 }} axisLine={false} tickLine={false}
                  tickFormatter={v => `+${v}%`} />
                <YAxis type="category" dataKey="delegation" tick={{ fill: '#9ca3af', fontSize: 10 }}
                  axisLine={false} tickLine={false} width={90} />
                <Tooltip content={({ active, payload, label }) => {
                  if (!active || !payload?.length) return null;
                  const d = payload[0]?.payload;
                  return (
                    <div className="rounded-xl border border-white/20 bg-[#111827] px-3 py-2.5 text-xs space-y-1">
                      <p className="font-bold text-white">{label}</p>
                      <p className="text-gray-400">{d?.governorate}</p>
                      <p className="text-[#96CEB4]">Growth: <strong>+{d?.growth_pct_12m}%</strong></p>
                      <p className="text-[#FF6B35]">Price: <strong>{fmt(d?.price_jan_tnd)} TND/m²</strong></p>
                    </div>
                  );
                }} />
                <Bar dataKey="growth_pct_12m" name="12m Growth %" radius={[0, 6, 6, 0]} maxBarSize={22}>
                  {top10Growth.map((_, i) => (
                    <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} fillOpacity={0.9} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-64 text-gray-600 text-sm">No growth data</div>
          )}
        </div>
      </div>

      {/* Row 3: Scatter — Price vs Growth positioning */}
      {mergedGovData.length > 0 && (
        <div className={CARD}>
          <p className="text-xs uppercase tracking-widest text-gray-500 mb-1">Growth vs Price Positioning</p>
          <p className="text-xs text-gray-600 mb-5">
            Each dot = one governorate. Top-right = high price + high growth (premium market).
            Bottom-left = affordable + stable.
          </p>
          <ResponsiveContainer width="100%" height={340}>
            <ScatterChart margin={{ left: 20, right: 20, top: 20, bottom: 30 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis type="number" dataKey="price_jan_tnd" name="Price/m²"
                tick={{ fill: '#6b7280', fontSize: 10 }} axisLine={false} tickLine={false}
                tickFormatter={v => `${(v / 1000).toFixed(0)}k`}
                label={{ value: 'Price per m² (TND)', position: 'insideBottom', offset: -15, fill: '#6b7280', fontSize: 11 }} />
              <YAxis type="number" dataKey="growth_pct_12m" name="12m Growth"
                tick={{ fill: '#6b7280', fontSize: 10 }} axisLine={false} tickLine={false}
                tickFormatter={v => `${v}%`}
                label={{ value: '12-Month Growth %', angle: -90, position: 'insideLeft', offset: 15, fill: '#6b7280', fontSize: 11 }} />
              <Tooltip content={<ScatterTip />} cursor={{ stroke: 'rgba(255,255,255,0.1)', strokeDasharray: '3 3' }} />
              <Scatter data={mergedGovData.filter(g => g.price_jan_tnd && g.growth_pct_12m != null)} fill={ORANGE}>
                {mergedGovData.filter(g => g.price_jan_tnd && g.growth_pct_12m != null).map((entry, i) => (
                  <Cell key={entry.governorate} fill={CHART_COLORS[i % CHART_COLORS.length]} fillOpacity={0.85} />
                ))}
              </Scatter>
            </ScatterChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Row 4: Livability bar + Radar chart */}
      {top12Livability.length > 0 && (
        <div className="grid lg:grid-cols-2 gap-6">

          {/* Livability scores */}
          <div className={CARD}>
            <p className="text-xs uppercase tracking-widest text-gray-500 mb-1">Quality of Life Index</p>
            <p className="text-xs text-gray-600 mb-5">Livability scores by region (0–100)</p>
            <ResponsiveContainer width="100%" height={320}>
              <BarChart data={top12Livability} layout="vertical"
                margin={{ left: 0, right: 40, top: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" horizontal={false} />
                <XAxis type="number" domain={[0, 100]} tick={{ fill: '#6b7280', fontSize: 10 }}
                  axisLine={false} tickLine={false} />
                <YAxis type="category" dataKey="governorate" tick={{ fill: '#9ca3af', fontSize: 10 }}
                  axisLine={false} tickLine={false} width={85} />
                <Tooltip content={<DashTooltip />} formatter={v => [`${v}/100`, 'Livability']} />
                <Bar dataKey="livability_score" name="Livability Score" radius={[0, 6, 6, 0]} maxBarSize={22}>
                  {top12Livability.map((entry, i) => (
                    <Cell key={entry.governorate} fill={CHART_COLORS[i % CHART_COLORS.length]} fillOpacity={0.85} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Multi-metric radar */}
          <div className={CARD}>
            <p className="text-xs uppercase tracking-widest text-gray-500 mb-1">Top Regions — Multi-Metric</p>
            <p className="text-xs text-gray-600 mb-5">
              Price, growth, livability, and sustainability compared (normalised 0–100)
            </p>
            {radarChartData.top5.length >= 2 ? (
              <ResponsiveContainer width="100%" height={300}>
                <RadarChart data={radarChartData.data}>
                  <PolarGrid stroke="rgba(255,255,255,0.08)" />
                  <PolarAngleAxis dataKey="subject" tick={{ fill: '#9ca3af', fontSize: 10 }} />
                  {radarChartData.top5.map((g, i) => (
                    <Radar key={g.governorate} name={g.governorate} dataKey={g.governorate}
                      stroke={CHART_COLORS[i]} fill={CHART_COLORS[i]} fillOpacity={0.12} strokeWidth={1.5} />
                  ))}
                  <Legend iconType="circle" iconSize={8}
                    wrapperStyle={{ fontSize: '10px', paddingTop: '8px' }}
                    formatter={v => <span style={{ color: '#9ca3af' }}>{v}</span>} />
                  <Tooltip content={({ active, payload, label }) => {
                    if (!active || !payload?.length) return null;
                    return (
                      <div className="rounded-xl border border-white/20 bg-[#111827] px-3 py-2.5 text-xs space-y-1">
                        <p className="font-bold text-white">{label}</p>
                        {payload.map((p, i) => (
                          <p key={i} style={{ color: p.color }}>{p.name}: <strong>{p.value}</strong></p>
                        ))}
                      </div>
                    );
                  }} />
                </RadarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-64 text-gray-600 text-sm">
                Insufficient data for comparison chart
              </div>
            )}
          </div>
        </div>
      )}

      {/* Row 5: Full sortable market rankings table */}
      <div className={CARD}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5">
          <div>
            <p className="text-xs uppercase tracking-widest text-gray-500 mb-0.5">Full Market Rankings</p>
            <p className="text-xs text-gray-600">All regions — click column headers to sort</p>
          </div>
          <div className="relative max-w-xs w-full">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
            <input type="text" placeholder="Search region…" value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full rounded-xl border border-white/15 bg-black/30 pl-9 pr-3 py-2 text-sm text-white placeholder-gray-600 focus:border-[#FF6B35]/60 focus:outline-none focus:ring-1 focus:ring-[#FF6B35]/30 transition-colors" />
          </div>
        </div>

        <div className="overflow-x-auto rounded-xl border border-white/10">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/10 bg-white/5">
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 w-8">#</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Region</th>
                <SortTh label="Jan 2026"      col="price_jan_tnd"       active={sortKey === 'price_jan_tnd'}       dir={sortDir} onClick={() => handleSort('price_jan_tnd')} />
                <SortTh label="Dec 2026"      col="price_dec_tnd"       active={sortKey === 'price_dec_tnd'}       dir={sortDir} onClick={() => handleSort('price_dec_tnd')} />
                <SortTh label="12m Growth"    col="growth_pct_12m"      active={sortKey === 'growth_pct_12m'}      dir={sortDir} onClick={() => handleSort('growth_pct_12m')} />
                <SortTh label="Livability"    col="livability_score"    active={sortKey === 'livability_score'}    dir={sortDir} onClick={() => handleSort('livability_score')} />
                <SortTh label="Sustainability" col="sustainability_score" active={sortKey === 'sustainability_score'} dir={sortDir} onClick={() => handleSort('sustainability_score')} />
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Risk Level</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {tableData.map((g, i) => (
                <tr key={g.governorate} className="hover:bg-white/5 transition-colors">
                  <td className="px-4 py-3 text-xs text-gray-600">{i + 1}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <MapPin size={12} className="text-gray-600 flex-shrink-0" />
                      <span className="text-sm font-semibold text-white">{g.governorate}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm font-medium text-[#4ECDC4]">
                    {g.price_jan_tnd ? `${fmt(g.price_jan_tnd)} TND/m²` : <span className="text-gray-600">—</span>}
                  </td>
                  <td className="px-4 py-3 text-sm font-medium text-[#FF6B35]">
                    {g.price_dec_tnd ? `${fmt(g.price_dec_tnd)} TND/m²` : <span className="text-gray-600">—</span>}
                  </td>
                  <td className="px-4 py-3">
                    {g.growth_pct_12m != null
                      ? <TrendBadge growth={g.growth_pct_12m} />
                      : <span className="text-gray-600">—</span>}
                  </td>
                  <td className="px-4 py-3">
                    {g.livability_score != null ? (
                      <div className="flex items-center gap-2">
                        <div className="w-16 h-1.5 rounded-full bg-white/10 overflow-hidden">
                          <div className="h-full rounded-full bg-green-400" style={{ width: `${g.livability_score}%` }} />
                        </div>
                        <span className="text-xs text-gray-300">{g.livability_score}</span>
                      </div>
                    ) : <span className="text-gray-600">—</span>}
                  </td>
                  <td className="px-4 py-3">
                    {g.sustainability_score != null ? (
                      <div className="flex items-center gap-2">
                        <div className="w-16 h-1.5 rounded-full bg-white/10 overflow-hidden">
                          <div className="h-full rounded-full bg-teal-400" style={{ width: `${g.sustainability_score}%` }} />
                        </div>
                        <span className="text-xs text-gray-300">{g.sustainability_score}</span>
                      </div>
                    ) : <span className="text-gray-600">—</span>}
                  </td>
                  <td className="px-4 py-3">
                    <RiskBadge category={g.risk_category} />
                  </td>
                </tr>
              ))}
              {tableData.length === 0 && (
                <tr>
                  <td colSpan={8} className="text-center text-gray-500 text-sm py-10">
                    No regions match your search
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <p className="text-xs text-gray-600 mt-3 flex items-center gap-1.5">
          <Info size={11} />
          Prices are averages across all neighbourhoods in each region.
          Growth is the 12-month forecast for 2026. Livability and sustainability scores are from environmental analysis.
        </p>
      </div>
    </section>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────────
const TABS = [
  { id: 'forecast',  label: 'Price Forecast',   icon: BarChart3       },
  { id: 'dashboard', label: 'Market Dashboard',  icon: LayoutDashboard },
];

export default function AnalyzePage() {
  const { user, trackActivity } = useAuth();
  const [activeTab, setActiveTab] = useState('forecast');

  useEffect(() => {
    trackActivity?.('analysis', 'analyze_page_view', { plan: user?.plan || 'free' });
  }, [trackActivity, user?.plan]);

  return (
    <main className="min-h-screen bg-gradient-to-b from-[#0B0F19] via-[#1A2332] to-[#0B0F19] pt-24 px-4 pb-16 text-white">
      <div className="max-w-6xl mx-auto space-y-8">

        <section>
          <h1 className="text-4xl md:text-5xl font-black text-white mb-2">Analyze</h1>
          <p className="text-gray-400 text-lg max-w-2xl">
            AI-powered market intelligence — price forecasts and real estate analytics across all of Tunisia.
          </p>
        </section>

        <div className="flex gap-1 rounded-2xl border border-white/10 bg-white/5 p-1.5">
          {TABS.map(({ id, label, icon: Icon }) => (
            <button key={id} onClick={() => setActiveTab(id)}
              className={`flex flex-1 items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold transition-all
                ${activeTab === id
                  ? 'bg-[#FF6B35] text-white shadow-lg shadow-[#FF6B35]/20'
                  : 'text-gray-400 hover:text-gray-200'}`}>
              <Icon size={15} />{label}
            </button>
          ))}
        </div>

        {activeTab === 'forecast'  && <PriceForecastSection />}
        {activeTab === 'dashboard' && <DashboardSection />}

      </div>
    </main>
  );
}
