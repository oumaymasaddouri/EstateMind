import React from 'react';
import { Briefcase, PlusCircle, RefreshCw, TrendingUp } from 'lucide-react';
import { Link } from 'react-router-dom';
import { getDashboardData, getInvestorPortfolio } from '../../services/api';
import { FALLBACK_PORTFOLIO, aggregatePortfolio, computeAssetReturn, formatMoney, formatPercent } from './workspace';

function StatCard({ label, value, hint, accent = false }) {
  return (
    <div className={`rounded-2xl border p-4 ${accent ? 'border-[#FF6B35]/30 bg-[#FF6B35]/10' : 'border-white/10 bg-black/20'}`}>
      <p className="text-xs uppercase tracking-[0.2em] text-gray-400">{label}</p>
      <p className="mt-1 text-2xl font-black text-white">{value}</p>
      {hint ? <p className="mt-1 text-xs text-[#FFB38F]">{hint}</p> : null}
    </div>
  );
}

function MetricRow({ label, value }) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-2xl border border-white/10 bg-black/20 px-4 py-3">
      <span className="text-sm text-gray-400">{label}</span>
      <span className="font-semibold text-white">{value}</span>
    </div>
  );
}

export default function InvestPortfolioPage() {
  const [portfolio, setPortfolio] = React.useState([]);
  const [dashboard, setDashboard] = React.useState(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState('');

  React.useEffect(() => {
    const loadPortfolio = async () => {
      setLoading(true);
      setError('');
      try {
        const [portfolioResponse, dashboardResponse] = await Promise.all([getInvestorPortfolio(), getDashboardData()]);
        setPortfolio(portfolioResponse.data);
        setDashboard(dashboardResponse.data);
      } catch (requestError) {
        setError('Live portfolio data is unavailable right now. Showing a professional fallback view.');
        setPortfolio(FALLBACK_PORTFOLIO);
      } finally {
        setLoading(false);
      }
    };

    loadPortfolio();
  }, []);

  const summary = aggregatePortfolio(portfolio);
  const investorPanel = dashboard?.investor_panel || {};

  return (
    <section className="space-y-6 p-5 md:p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-[#FFB38F]">
            <Briefcase size={18} />
            <p className="text-xs font-semibold uppercase tracking-[0.22em]">Portfolio</p>
          </div>
          <h3 className="mt-2 text-2xl font-black text-white">Portfolio Dashboard</h3>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-gray-300">
            Track equity, yield, and return quality across the holdings that matter most.
          </p>
        </div>

        <div className="flex gap-3">
          <Link
            to="/invest/assets"
            className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-semibold text-white transition hover:border-[#FF6B35]/40 hover:bg-[#FF6B35]/10"
          >
            <PlusCircle size={16} />
            Add asset
          </Link>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="inline-flex items-center gap-2 rounded-xl bg-[#FF6B35] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#E85C2C]"
          >
            <RefreshCw size={16} />
            Refresh
          </button>
        </div>
      </div>

      {error ? (
        <div className="rounded-2xl border border-[#FF6B35]/30 bg-[#FF6B35]/10 p-4 text-sm text-gray-100">
          {error}
        </div>
      ) : null}

      <div className="grid gap-4 md:grid-cols-4">
        <StatCard label="Portfolio value" value={formatMoney(summary.totalCurrent)} hint="Current estimated value" accent />
        <StatCard label="Invested capital" value={formatMoney(summary.totalPurchase)} hint="Historical basis" />
        <StatCard label="Unrealized gain" value={formatMoney(summary.totalGain)} hint="Mark-to-market performance" />
        <StatCard label="Assets tracked" value={portfolio.length} hint="Live holdings count" />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.55fr_0.95fr]">
        <div className="rounded-3xl border border-white/10 bg-white/5 p-4 md:p-5">
          <div className="flex items-center justify-between gap-3 border-b border-white/10 pb-4">
            <div>
              <h4 className="text-lg font-bold text-white">Holdings</h4>
              <p className="text-sm text-gray-400">Sorted by latest additions, with return and yield context.</p>
            </div>
            <div className="rounded-full border border-white/10 bg-black/20 px-3 py-1 text-xs text-gray-300">
              {loading ? 'Loading...' : `Investor plan: ${dashboard?.overview?.plan || 'free'}`}
            </div>
          </div>

          <div className="mt-4 space-y-3">
            {portfolio.map((asset) => {
              const stats = computeAssetReturn(asset);
              return (
                <article key={`${asset.property_name}-${asset.created_at}`} className="rounded-2xl border border-white/10 bg-black/20 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <h5 className="font-semibold text-white">{asset.property_name}</h5>
                      <p className="mt-1 text-xs text-gray-400">Added {asset.created_at ? new Date(asset.created_at).toLocaleDateString() : 'recently'}</p>
                    </div>
                    <div className="flex items-center gap-2 rounded-full bg-[#FF6B35]/10 px-3 py-1 text-xs font-semibold text-[#FFB38F]">
                      <TrendingUp size={13} />
                      {formatPercent(stats.roi, 1)} ROI
                    </div>
                  </div>

                  <div className="mt-4 grid gap-3 sm:grid-cols-3">
                    <div>
                      <p className="text-xs uppercase tracking-wide text-gray-500">Purchase</p>
                      <p className="mt-1 font-semibold text-white">{formatMoney(asset.purchase_price)}</p>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-wide text-gray-500">Current value</p>
                      <p className="mt-1 font-semibold text-white">{formatMoney(asset.current_value)}</p>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-wide text-gray-500">Monthly rent</p>
                      <p className="mt-1 font-semibold text-white">{formatMoney(asset.monthly_rent)}</p>
                    </div>
                  </div>

                  <div className="mt-4 flex flex-wrap items-center gap-3 text-sm text-gray-300">
                    <span className="rounded-full border border-white/10 px-3 py-1">Gain {formatMoney(stats.gain)}</span>
                    <span className="rounded-full border border-white/10 px-3 py-1">Yield {formatPercent(stats.yieldPercent, 1)}</span>
                    <span className="rounded-full border border-white/10 px-3 py-1">Current / Purchase {((Number(asset.current_value || 0) / Math.max(Number(asset.purchase_price || 0), 1)) * 100).toFixed(0)}%</span>
                  </div>
                </article>
              );
            })}
          </div>
        </div>

        <aside className="space-y-4">
          <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
            <h4 className="text-lg font-bold text-white">Portfolio quality</h4>
            <p className="mt-2 text-sm text-gray-400">A compact summary for quick triage.</p>

            <div className="mt-4 space-y-4">
              <MetricRow label="Average ROI" value={formatPercent(summary.averageRoi, 2)} />
              <MetricRow label="Average yield" value={formatPercent(summary.averageYield, 2)} />
              <MetricRow label="Annual rent" value={formatMoney(summary.annualRent)} />
              <MetricRow label="Risk level" value={(investorPanel.risk_level || 'medium').toUpperCase()} />
            </div>
          </div>

          <div className="rounded-3xl border border-[#FF6B35]/25 bg-[#FF6B35]/10 p-5 text-sm text-gray-100">
            <p className="font-semibold text-white">Why this layout works</p>
            <p className="mt-2 leading-6 text-gray-300">
              It keeps the highest-value portfolio metrics visible first, while the asset rows stay close enough to drill into individual holdings without losing context.
            </p>
          </div>
        </aside>
      </div>
    </section>
  );
}