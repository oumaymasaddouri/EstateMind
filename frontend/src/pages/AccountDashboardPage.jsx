import React, { useEffect, useMemo, useState } from 'react';
import {
  Activity,
  BarChart3,
  Bell,
  Briefcase,
  Compass,
  Crown,
  FileText,
  LineChart,
  Settings,
  Sparkles,
  Target,
  TrendingUp,
  User,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { getDashboardData } from '../services/api';

function SectionCard({ title, subtitle, icon: Icon, children }) {
  return (
    <section className="rounded-2xl border border-white/10 bg-white/5 p-5 md:p-6">
      <div className="mb-4 flex items-center gap-3">
        <div className="rounded-lg bg-[#FF6B35]/15 p-2 text-[#FFB38F]">
          <Icon size={18} />
        </div>
        <div>
          <h2 className="text-lg font-bold text-white">{title}</h2>
          {subtitle ? <p className="text-sm text-gray-400">{subtitle}</p> : null}
        </div>
      </div>
      {children}
    </section>
  );
}

function MetricCard({ label, value, hint }) {
  return (
    <div className="rounded-xl border border-white/10 bg-black/20 p-4">
      <p className="text-xs uppercase tracking-wide text-gray-400">{label}</p>
      <p className="mt-1 text-xl font-bold text-white">{value}</p>
      {hint ? <p className="mt-1 text-xs text-[#FFB38F]">{hint}</p> : null}
    </div>
  );
}

export default function AccountDashboardPage() {
  const { user, hasAccess, upgradePlan, trackActivity } = useAuth();
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const loadDashboard = async () => {
      setLoading(true);
      setError('');
      try {
        const response = await getDashboardData();
        setDashboard(response.data);
      } catch (err) {
        setError('Unable to load dashboard data right now.');
      } finally {
        setLoading(false);
      }
    };

    loadDashboard();
  }, []);

  const insights = dashboard?.insights || {};
  const aiActivity = dashboard?.ai_activity || {};
  const savedTracked = dashboard?.saved_tracked || {};
  const investorEnabled = dashboard?.investor_panel?.enabled;
  const personalization = dashboard?.personalization || {};
  const upgradeTriggers = dashboard?.upgrade_triggers || [];
  const savedCount = savedTracked.saved_count ?? (savedTracked.saved_properties || []).length;
  const valuationCount = savedTracked.valuations_count ?? (savedTracked.valuation_history || []).length;

  const usageLevel = useMemo(() => {
    const totalActions =
      (aiActivity.valuations || 0) +
      (aiActivity.analyses || 0) +
      (aiActivity.simulations || 0) +
      (aiActivity.legal_sessions || 0);
    if (totalActions > 20) return 'High';
    if (totalActions > 8) return 'Medium';
    return 'Getting Started';
  }, [aiActivity]);

  const handleUpgrade = async (targetPlan) => {
    try {
      await trackActivity('cta_click', 'dashboard_upgrade_click', {
        source: 'dashboard',
        target_plan: targetPlan,
      });
      await upgradePlan(targetPlan);
      const refreshed = await getDashboardData();
      setDashboard(refreshed.data);
    } catch (err) {
      setError('Upgrade action failed. Please retry.');
    }
  };

  if (loading) {
    return (
      <main className="min-h-screen bg-gradient-to-b from-[#0B0F19] via-[#1A2332] to-[#0B0F19] px-4 pb-16 pt-24">
        <div className="mx-auto max-w-7xl rounded-2xl border border-white/10 bg-white/5 p-6 text-gray-300">
          Loading dashboard...
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-[#0B0F19] via-[#1A2332] to-[#0B0F19] px-4 pb-16 pt-24">
      <div className="mx-auto max-w-7xl space-y-6">
        <section className="rounded-2xl border border-white/10 bg-white/5 p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-sm uppercase tracking-wider text-[#FFB38F]">Account Dashboard</p>
              <h1 className="mt-1 text-3xl font-black text-white md:text-4xl">
                Your Real Estate Intelligence Cockpit
              </h1>
              <p className="mt-2 text-gray-400">
                Plan: <span className="font-semibold text-white">{dashboard?.overview?.plan || user?.plan || 'free'}</span>
                {' '}• Usage level: <span className="font-semibold text-white">{usageLevel}</span>
              </p>
            </div>
            {!hasAccess('investor') ? (
              <button
                type="button"
                onClick={() => handleUpgrade('investor')}
                className="rounded-xl bg-[#FF6B35] px-4 py-2.5 font-semibold text-white transition hover:bg-[#E85C2C]"
              >
                Upgrade to Investor
              </button>
            ) : null}
          </div>
          {error ? <p className="mt-3 text-sm text-red-300">{error}</p> : null}
        </section>

        {(upgradeTriggers.length > 0 || (dashboard?.conversion_metrics?.cta_clicks || 0) > 0) ? (
          <section className="rounded-2xl border border-[#FF6B35]/40 bg-gradient-to-r from-[#FF6B35]/15 via-[#FF6B35]/5 to-transparent p-6 shadow-[0_0_30px_rgba(255,107,53,0.18)]">
            <p className="text-xs uppercase tracking-widest text-[#FFB38F]">Smart Insights</p>
            <h2 className="mt-1 text-2xl font-black text-white">Behavior-driven recommendations for your next move</h2>
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              {upgradeTriggers.map((trigger) => (
                <article key={`smart-${trigger.type}`} className="rounded-xl border border-[#FF6B35]/35 bg-black/20 p-4">
                  <p className="text-sm text-white">{trigger.message || trigger.headline}</p>
                  <button
                    type="button"
                    onClick={() => handleUpgrade(trigger.target_plan)}
                    className="mt-3 rounded-lg bg-[#FF6B35] px-3 py-2 text-sm font-semibold text-white"
                  >
                    {trigger.cta}
                  </button>
                </article>
              ))}
              {(dashboard?.conversion_metrics?.cta_clicks || 0) > 0 ? (
                <article className="rounded-xl border border-white/15 bg-black/20 p-4">
                  <p className="text-sm text-gray-200">You clicked {(dashboard?.conversion_metrics?.cta_clicks || 0)} upgrade CTA(s). Keep exploring to unlock the best plan match.</p>
                </article>
              ) : null}
            </div>
          </section>
        ) : null}

        <div className="grid gap-6 lg:grid-cols-3">
          <SectionCard title="User Overview" subtitle="Identity, plan, account health" icon={User}>
            <div className="grid gap-3">
              <MetricCard label="Name" value={dashboard?.overview?.full_name || 'User'} />
              <MetricCard label="Email" value={dashboard?.overview?.email || '-'} />
              <MetricCard label="Plan" value={(dashboard?.overview?.plan || 'free').toUpperCase()} />
              <MetricCard
                label="Account Status"
                value={dashboard?.overview?.is_email_verified ? 'Verified' : 'Pending Verification'}
              />
            </div>
          </SectionCard>

          <SectionCard title="Personal Insights" subtitle="Region-aware market view" icon={TrendingUp}>
            <div className="grid gap-3">
              <MetricCard label="Region" value={insights.region || 'Tunisia'} />
              <MetricCard
                label="Average Price"
                value={insights.avg_price ? `${Math.round(insights.avg_price).toLocaleString()} TND` : 'No data yet'}
              />
              <MetricCard
                label="Suggested Action"
                value={personalization.suggested_actions?.[0] || 'Start with Explore and save listings.'}
              />
            </div>
          </SectionCard>

          <SectionCard title="Saved & Tracked Properties" subtitle="Your active watchlist" icon={Compass}>
            <div className="grid gap-3">
              <MetricCard label="Saved Listings" value={savedCount} />
              <MetricCard label="Tracked Listings" value={(savedTracked.tracked_properties || []).length} />
              <MetricCard label="Valuation History" value={valuationCount} />
            </div>
            {savedCount === 0 ? (
              <div className="mt-3 rounded-xl border border-[#FF6B35]/30 bg-[#FF6B35]/10 p-3 text-sm text-gray-200">
                Start saving properties to build your dashboard intelligence and personalized recommendations.
              </div>
            ) : null}
          </SectionCard>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          <SectionCard title="AI Activity Center" subtitle="Your usage across modules" icon={Activity}>
            <div className="grid gap-3 sm:grid-cols-2">
              <MetricCard label="Valuations" value={aiActivity.valuations || 0} />
              <MetricCard label="Analyses" value={aiActivity.analyses || 0} />
              <MetricCard label="Simulations" value={aiActivity.simulations || 0} />
              <MetricCard label="Legal Sessions" value={aiActivity.legal_sessions || 0} />
            </div>
          </SectionCard>

          <SectionCard title="Legal Assistant Access" subtitle="Saved legal workflows" icon={FileText}>
            <div className="grid gap-3">
              <MetricCard label="Saved Sessions" value={(dashboard?.legal_center?.saved_sessions || []).length} />
              <MetricCard label="Ongoing Processes" value={(dashboard?.legal_center?.ongoing_processes || []).length} />
              <MetricCard label="Checklist Items" value={(dashboard?.legal_center?.document_checklist || []).length} />
            </div>
          </SectionCard>

          <SectionCard title="Simulation Access" subtitle="What-if scenarios and reruns" icon={LineChart}>
            <div className="grid gap-3">
              <MetricCard label="Saved Scenarios" value={(dashboard?.simulation_center?.saved_scenarios || []).length} />
              <MetricCard
                label="Quick Recommendation"
                value={
                  hasAccess('pro')
                    ? 'Run a scenario to compare tax/policy impacts.'
                    : 'Upgrade to Pro to run your first simulation.'
                }
              />
            </div>
          </SectionCard>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          <SectionCard title="Investment Panel" subtitle="Investor-only metrics" icon={Briefcase}>
            {investorEnabled ? (
              <div className="grid gap-3 sm:grid-cols-2">
                <MetricCard label="Portfolio Assets" value={dashboard?.investor_panel?.portfolio_count || 0} />
                <MetricCard label="Portfolio Value" value={`${dashboard?.investor_panel?.portfolio_value || 0} TND`} />
                <MetricCard label="ROI Value" value={`${dashboard?.investor_panel?.roi_value || 0} TND`} />
                <MetricCard label="ROI" value={`${dashboard?.investor_panel?.roi_percent || 0}%`} />
                <MetricCard label="Yield" value={`${dashboard?.investor_panel?.yield_percent || 0}%`} />
                <MetricCard label="Risk Level" value={dashboard?.investor_panel?.risk_level || 'medium'} />
              </div>
            ) : (
              <div className="space-y-3 rounded-xl border border-[#FF6B35]/30 bg-[#FF6B35]/8 p-4">
                <p className="text-sm text-gray-200">
                  Unlock portfolio intelligence, ROI analytics, and investor-grade monitoring.
                </p>
                <button
                  type="button"
                  onClick={() => handleUpgrade('investor')}
                  className="rounded-xl bg-[#FF6B35] px-4 py-2 text-sm font-semibold text-white"
                >
                  Upgrade to Investor (500 TND)
                </button>
              </div>
            )}
          </SectionCard>

          <SectionCard title="Community Integration" subtitle="#Aaref_Bledek participation" icon={Target}>
            <div className="grid gap-3">
              <MetricCard label="Role" value={(dashboard?.community?.role || 'learner').toUpperCase()} />
              <MetricCard label="Contributions" value={dashboard?.community?.contributions || 0} />
              <MetricCard label="Activities" value={dashboard?.community?.activities || 0} />
            </div>
          </SectionCard>

          <SectionCard title="Account & Settings" subtitle="Profile and subscription controls" icon={Settings}>
            <div className="grid gap-3">
              <MetricCard label="Personalization Profile" value={personalization.behavior_profile || 'explorer'} />
              <MetricCard label="Current Region Focus" value={personalization.region || 'Tunisia'} />
              <MetricCard
                label="Notifications"
                value={user?.preferences?.notifications_enabled === false ? 'Disabled' : 'Enabled'}
              />
            </div>
          </SectionCard>
        </div>

        <SectionCard title="Smart Upgrade Triggers" subtitle="Context-aware monetization prompts" icon={Crown}>
          {upgradeTriggers.length ? (
            <div className="grid gap-3 md:grid-cols-2">
              {upgradeTriggers.map((trigger) => (
                <div key={trigger.type} className="rounded-xl border border-[#FF6B35]/30 bg-[#FF6B35]/10 p-4">
                  <p className="text-sm text-gray-100">{trigger.headline}</p>
                  <button
                    type="button"
                    onClick={() => handleUpgrade(trigger.target_plan)}
                    className="mt-3 inline-flex items-center gap-2 rounded-lg bg-[#FF6B35] px-3 py-2 text-sm font-semibold text-white"
                  >
                    <Sparkles size={14} />
                    {trigger.cta}
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-xl border border-green-500/20 bg-green-500/10 p-4 text-sm text-green-100">
              No upgrade pressure right now. Your plan is aligned with your activity.
            </div>
          )}
        </SectionCard>

        <SectionCard title="Advanced Personalization" subtitle="Phase 3 adaptive recommendation layer" icon={BarChart3}>
          <div className="grid gap-3 md:grid-cols-3">
            <MetricCard label="Plan-Aware" value={dashboard?.overview?.plan || 'free'} hint="UI and feature surface adapt to subscription tier" />
            <MetricCard label="Behavior-Aware" value={personalization.behavior_profile || 'explorer'} hint="Suggestions evolve with activity patterns" />
            <MetricCard label="Location-Aware" value={personalization.region || 'Tunisia'} hint="Insights prioritize regional market context" />
          </div>
          <div className="mt-4 rounded-xl border border-white/10 bg-black/20 p-4 text-sm text-gray-300">
            <p>
              {personalization.suggested_actions?.[1] || 'Keep interacting with Analyze, Valuate, and Explore to strengthen personalization quality.'}
            </p>
          </div>
        </SectionCard>
      </div>
    </main>
  );
}
