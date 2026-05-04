import React from 'react';
import { AlertTriangle, ShieldAlert } from 'lucide-react';
import { getDashboardData, getInvestorPortfolio } from '../../services/api';
import { FALLBACK_PORTFOLIO, aggregatePortfolio, computeAssetReturn, formatMoney, formatPercent } from './workspace';

export default function InvestRiskPage() {
  const [portfolio, setPortfolio] = React.useState(FALLBACK_PORTFOLIO);
  const [dashboard, setDashboard] = React.useState(null);

  React.useEffect(() => {
    const load = async () => {
      try {
        const [portfolioResponse, dashboardResponse] = await Promise.all([getInvestorPortfolio(), getDashboardData()]);
        setPortfolio(portfolioResponse.data);
        setDashboard(dashboardResponse.data);
      } catch (requestError) {
        setPortfolio(FALLBACK_PORTFOLIO);
      }
    };

    load();
  }, []);

  const summary = aggregatePortfolio(portfolio);
  const riskLevel = dashboard?.investor_panel?.risk_level || 'medium';

  return (
    <section className="space-y-6 p-5 md:p-6">
      <div>
        <div className="flex items-center gap-2 text-[#FFB38F]">
          <ShieldAlert size={18} />
          <p className="text-xs font-semibold uppercase tracking-[0.22em]">Risk</p>
        </div>
        <h3 className="mt-2 text-2xl font-black text-white">Risk Dashboard</h3>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-gray-300">
          Concentration, liquidity, and income stability are combined into a single operating view.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <RiskCard label="Risk level" value={riskLevel.toUpperCase()} tone={riskLevel === 'high' ? 'high' : 'neutral'} />
        <RiskCard label="Concentration proxy" value={formatPercent((summary.totalCurrent / Math.max(summary.totalPurchase, 1)) * 100, 1)} tone="neutral" />
        <RiskCard label="Annual rental cash flow" value={formatMoney(summary.annualRent)} tone="neutral" />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.25fr_0.95fr]">
        <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
          <h4 className="text-lg font-bold text-white">Asset risk profile</h4>
          <div className="mt-4 space-y-3">
            {portfolio.map((asset) => {
              const stats = computeAssetReturn(asset);
              const health = stats.roi > 18 ? 'Strong' : stats.roi > 8 ? 'Balanced' : 'Watch';
              return (
                <div key={asset.property_name} className="rounded-2xl border border-white/10 bg-black/20 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="font-semibold text-white">{asset.property_name}</p>
                      <p className="text-xs text-gray-400">{health} return profile</p>
                    </div>
                    <span className="rounded-full border border-white/10 px-3 py-1 text-xs text-gray-300">{formatPercent(stats.roi, 1)} ROI</span>
                  </div>
                  <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/10">
                    <div className="h-full rounded-full bg-gradient-to-r from-[#FF6B35] to-[#FFD0BF]" style={{ width: `${Math.min(Math.max(stats.roi * 4, 18), 100)}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <aside className="rounded-3xl border border-[#FF6B35]/25 bg-[#FF6B35]/10 p-5 text-sm text-gray-100">
          <div className="flex items-center gap-2 text-white">
            <AlertTriangle size={16} className="text-[#FFD1BE]" />
            <p className="font-semibold">Risk notes</p>
          </div>
          <p className="mt-3 leading-6 text-gray-300">
            The dashboard keeps exposure readable at a glance. Assets with slow appreciation or weak rent coverage should be reviewed before adding more capital.
          </p>
        </aside>
      </div>
    </section>
  );
}

function RiskCard({ label, value, tone }) {
  return (
    <div className={`rounded-2xl border p-4 ${tone === 'high' ? 'border-red-400/30 bg-red-500/10' : 'border-white/10 bg-black/20'}`}>
      <p className="text-xs uppercase tracking-[0.2em] text-gray-400">{label}</p>
      <p className="mt-1 text-2xl font-black text-white">{value}</p>
    </div>
  );
}