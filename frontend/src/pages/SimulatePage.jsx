import React, { useState } from 'react';
import { LineChart, PlayCircle, SlidersHorizontal } from 'lucide-react';
import FeatureGate from '../components/access/FeatureGate';
import { useAuth } from '../context/AuthContext';

function InformationalSimulateMode() {
  return (
    <section className="space-y-6">
      <div>
        <h1 className="text-4xl font-black text-white">Market Scenario Simulator</h1>
        <p className="mt-2 text-gray-400">
          Understand potential market outcomes before taking action. Run policy, demand, and pricing what-if scenarios.
        </p>
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        {[
          'Tax increase/decrease impact',
          'Demand shock by region',
          'Interest rate sensitivity',
        ].map((scenario) => (
          <div key={scenario} className="rounded-xl border border-white/10 bg-white/5 p-4 text-gray-200">
            {scenario}
          </div>
        ))}
      </div>
    </section>
  );
}

function FunctionalSimulateMode() {
  const { user, upgradePlan, trackActivity } = useAuth();
  const [taxDelta, setTaxDelta] = useState(5);
  const [demandDelta, setDemandDelta] = useState(8);
  const [hasSimulated, setHasSimulated] = useState(false);

  const projectedPrice = (100 + demandDelta - taxDelta * 0.6).toFixed(1);

  const runSimulation = async () => {
    setHasSimulated(true);
    await trackActivity('simulation', 'simulate_run', {
      tax_delta: taxDelta,
      demand_delta: demandDelta,
      projected_price: projectedPrice,
    });
  };

  const handleInvestorUpgrade = async () => {
    await trackActivity('cta_click', 'simulate_upgrade_click', {
      page: 'simulate',
      trigger: 'post_simulation',
      target_plan: 'investor',
    });
    await upgradePlan('investor');
  };

  return (
    <section className="space-y-6">
      <div>
        <h1 className="text-4xl font-black text-white">Interactive Simulation Studio</h1>
        <p className="mt-2 text-gray-400">Adjust market levers and estimate directional impact.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-xl border border-white/10 bg-white/5 p-5">
          <label className="text-sm text-gray-300">Tax change (%)</label>
          <input
            type="range"
            min="-10"
            max="20"
            value={taxDelta}
            onChange={(e) => setTaxDelta(Number(e.target.value))}
            className="mt-3 w-full"
          />
          <p className="mt-2 text-white">{taxDelta}%</p>
        </div>

        <div className="rounded-xl border border-white/10 bg-white/5 p-5">
          <label className="text-sm text-gray-300">Demand shift (%)</label>
          <input
            type="range"
            min="-20"
            max="30"
            value={demandDelta}
            onChange={(e) => setDemandDelta(Number(e.target.value))}
            className="mt-3 w-full"
          />
          <p className="mt-2 text-white">{demandDelta}%</p>
        </div>
      </div>

      <div className="rounded-xl border border-[#FF6B35]/30 bg-[#FF6B35]/10 p-5">
        <p className="text-sm text-gray-300">Projected market price index</p>
        <p className="mt-1 text-3xl font-black text-white">{projectedPrice}</p>
        <p className="mt-2 text-sm text-[#FFB38F]">Use this directional score to compare buy-now vs wait decisions.</p>
        <button
          type="button"
          onClick={runSimulation}
          className="mt-4 rounded-lg bg-[#FF6B35] px-4 py-2 text-sm font-semibold text-white"
        >
          Run Simulation
        </button>
      </div>

      {hasSimulated && (user?.plan || '').toLowerCase() === 'pro' ? (
        <div className="rounded-xl border border-[#FF6B35]/35 bg-[#FF6B35]/10 p-4 text-sm text-gray-100">
          Simulate full investment strategies and compare portfolio-level outcomes with Investor plan.
          <button
            type="button"
            onClick={handleInvestorUpgrade}
            className="ml-3 rounded-lg bg-[#FF6B35] px-3 py-1.5 text-sm font-semibold text-white"
          >
            Upgrade to Investor
          </button>
        </div>
      ) : null}
    </section>
  );
}

export default function SimulatePage() {
  const { user, upgradePlan, trackActivity } = useAuth();

  const handleUpgrade = async () => {
    await trackActivity('cta_click', 'simulate_upgrade_click', {
      page: 'simulate',
      trigger: 'feature_gate',
      target_plan: 'pro',
    });
    await upgradePlan('pro');
  };

  React.useEffect(() => {
    trackActivity('simulation', 'simulate_page_view', { plan: user?.plan || 'free' });
  }, [trackActivity, user?.plan]);

  return (
    <main className="min-h-screen bg-gradient-to-b from-[#0B0F19] via-[#1A2332] to-[#0B0F19] px-4 pb-16 pt-24">
      <div className="mx-auto max-w-6xl space-y-8">
        <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
          <div className="flex items-center gap-3 text-[#FFB38F]">
            <LineChart size={18} />
            <p className="text-sm uppercase tracking-widest">Pro Feature</p>
          </div>
          <h1 className="mt-2 text-3xl font-black text-white">Simulate Module</h1>
          <p className="mt-1 text-gray-400">Scenario simulation tools for market timing and strategic foresight.</p>
        </div>

        <FeatureGate
          user={user}
          requiredPlan="pro"
          featureName="Simulate"
          informational={<InformationalSimulateMode />}
          onUpgrade={handleUpgrade}
          upgradeDescription="Pro unlocks interactive scenario modeling and saved simulation runs."
        >
          <FunctionalSimulateMode />
        </FeatureGate>
      </div>
    </main>
  );
}
