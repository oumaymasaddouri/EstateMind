import React from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { Briefcase, Building2, Layers3, ShieldAlert, Sparkles, Target } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { getDashboardData } from '../services/api';

const INVEST_SECTIONS = [
  { label: 'Portfolio', path: '/invest/portfolio', icon: Briefcase, hint: 'Holdings and returns' },
  { label: 'Scanner', path: '/invest/scanner', icon: Target, hint: 'Live deal discovery' },
  { label: 'Opportunities', path: '/invest/opportunities', icon: Sparkles, hint: 'Ranked opportunities' },
  { label: 'Risk', path: '/invest/risk', icon: ShieldAlert, hint: 'Exposure and climate' },
  { label: 'Assets', path: '/invest/assets', icon: Building2, hint: 'Add and manage assets' },
];

function MetricCard({ label, value, hint }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
      <p className="text-xs uppercase tracking-[0.22em] text-gray-400">{label}</p>
      <p className="mt-1 text-xl font-bold text-white">{value}</p>
      {hint ? <p className="mt-1 text-xs text-[#FFB38F]">{hint}</p> : null}
    </div>
  );
}

export default function InvestPage() {
  const { user, trackActivity } = useAuth();
  const [dashboard, setDashboard] = React.useState(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    const loadDashboard = async () => {
      setLoading(true);
      try {
        const response = await getDashboardData();
        setDashboard(response.data);
      } catch (error) {
        setDashboard(null);
      } finally {
        setLoading(false);
      }
    };

    loadDashboard();
  }, []);

  React.useEffect(() => {
    trackActivity('analysis', 'invest_page_view', { plan: user?.plan || 'free' });
  }, [trackActivity, user?.plan]);

  const investorPanel = dashboard?.investor_panel || {};
  const featureNudges = dashboard?.feature_nudges?.invest || {};
  const savedCount = featureNudges.saved_properties_count || dashboard?.saved_tracked?.saved_count || 0;
  const portfolioCount = investorPanel.portfolio_count || 0;

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(255,107,53,0.18),_transparent_38%),linear-gradient(180deg,#0B0F19_0%,#121A28_45%,#0B0F19_100%)] px-4 pb-16 pt-24 text-white">
      <div className="mx-auto max-w-7xl space-y-6">
        <section className="overflow-hidden rounded-[28px] border border-white/10 bg-white/5 shadow-2xl backdrop-blur-xl">
          <div className="grid gap-0 lg:grid-cols-[290px_1fr]">
            <aside className="border-b border-white/10 bg-black/20 p-5 lg:border-b-0 lg:border-r">
              <div className="space-y-4">
                <div className="flex items-center gap-3 text-[#FFB38F]">
                  <Layers3 size={18} />
                  <p className="text-xs font-semibold uppercase tracking-[0.24em]">Investor Workspace</p>
                </div>
                <div>
                  <h1 className="text-3xl font-black tracking-tight text-white">Invest</h1>
                  <p className="mt-2 text-sm leading-6 text-gray-300">
                    A structured workspace for portfolio monitoring, opportunity discovery, and risk control.
                  </p>
                </div>

                <div className="grid gap-3">
                  {INVEST_SECTIONS.map((section) => {
                    const Icon = section.icon;
                    return (
                      <NavLink
                        key={section.path}
                        to={section.path}
                        className={({ isActive }) =>
                          [
                            'group flex items-center justify-between rounded-2xl border px-4 py-3 transition-all duration-200',
                            isActive
                              ? 'border-[#FF6B35]/70 bg-[#FF6B35]/15 text-white shadow-lg shadow-[#FF6B35]/10'
                              : 'border-white/10 bg-white/5 text-gray-300 hover:border-white/20 hover:bg-white/10 hover:text-white',
                          ].join(' ')
                        }
                      >
                        <div className="flex items-center gap-3">
                          <span className="rounded-xl bg-black/20 p-2 text-[#FFB38F] group-hover:text-[#FFD1BE]">
                            <Icon size={16} />
                          </span>
                          <div>
                            <p className="font-semibold">{section.label}</p>
                            <p className="text-xs text-gray-400">{section.hint}</p>
                          </div>
                        </div>
                      </NavLink>
                    );
                  })}
                </div>

                <div className="rounded-2xl border border-[#FF6B35]/25 bg-[#FF6B35]/10 p-4 text-sm text-gray-100">
                  <p className="font-semibold text-white">Plan status</p>
                  <p className="mt-1 text-gray-300">
                    {loading ? 'Loading dashboard...' : `Portfolio: ${portfolioCount} assets · Saved: ${savedCount}`}
                  </p>
                  <p className="mt-3 text-xs uppercase tracking-[0.18em] text-[#FFB38F]">
                    {user?.plan || 'free'} plan
                  </p>
                </div>
              </div>
            </aside>

            <div className="p-5 md:p-6 lg:p-7">
              <div className="flex flex-wrap items-end justify-between gap-4 border-b border-white/10 pb-5">
                <div>
                  <p className="text-xs uppercase tracking-[0.24em] text-[#FFB38F]">Investment intelligence</p>
                  <h2 className="mt-1 text-2xl font-black text-white">Portfolio-first, opportunity-second</h2>
                  <p className="mt-2 max-w-2xl text-sm leading-6 text-gray-300">
                    Use the sidebar to move from portfolio health to scanner results, opportunity ranking, risk, and asset maintenance.
                  </p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-gray-300">
                  Data source: live account dashboard and portfolio endpoints
                </div>
              </div>

              <div className="mt-5 grid gap-4 md:grid-cols-3">
                <MetricCard
                  label="Portfolio value"
                  value={`${Number(investorPanel.portfolio_value || 0).toLocaleString()} TND`}
                  hint="Current estimated holdings"
                />
                <MetricCard
                  label="ROI"
                  value={`${Number(investorPanel.roi_percent || 0).toFixed(2)}%`}
                  hint="Equity growth versus purchase price"
                />
                <MetricCard
                  label="Yield"
                  value={`${Number(investorPanel.yield_percent || 0).toFixed(2)}%`}
                  hint="Rental income relative to basis"
                />
              </div>

              <div className="mt-5 rounded-[24px] border border-white/10 bg-[#0C111D]/70 p-1">
                <Outlet />
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
