import React from 'react';
import { ArrowRight, Sparkles, Target } from 'lucide-react';
import { getMapOpportunities } from '../../services/api';
import { FALLBACK_OPPORTUNITIES, formatMoney, formatPercent, normalizeOpportunities } from './workspace';

export default function InvestOpportunitiesPage() {
  const [opportunities, setOpportunities] = React.useState(FALLBACK_OPPORTUNITIES);
  const [error, setError] = React.useState('');

  React.useEffect(() => {
    const load = async () => {
      try {
        const response = await getMapOpportunities({ min_score: 60 });
        setOpportunities(normalizeOpportunities(response.data));
      } catch (requestError) {
        setError('Live opportunity ranking is unavailable right now. Showing a curated shortlist instead.');
      }
    };

    load();
  }, []);

  return (
    <section className="space-y-6 p-5 md:p-6">
      <div>
        <div className="flex items-center gap-2 text-[#FFB38F]">
          <Sparkles size={18} />
          <p className="text-xs font-semibold uppercase tracking-[0.22em]">Opportunities</p>
        </div>
        <h3 className="mt-2 text-2xl font-black text-white">Curated Opportunity Shortlist</h3>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-gray-300">
          This section translates scanner signals into action-ready opportunities with a cleaner decision surface.
        </p>
      </div>

      {error ? (
        <div className="rounded-2xl border border-[#FF6B35]/30 bg-[#FF6B35]/10 p-4 text-sm text-gray-100">{error}</div>
      ) : null}

      <div className="grid gap-4 xl:grid-cols-2">
        {opportunities.map((item, index) => (
          <article key={`${item.delegation || index}-opportunity`} className="rounded-3xl border border-white/10 bg-white/5 p-5">
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-4">
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-gray-400">{item.region || 'Tunisia'}</p>
                <h4 className="mt-1 text-xl font-bold text-white">{item.delegation || item.name || 'Opportunity'}</h4>
              </div>
              <div className="rounded-full bg-[#FF6B35]/10 px-3 py-1 text-sm font-semibold text-[#FFB38F]">
                Score {formatPercent(item.opportunity_score || item.score || 0, 1)}
              </div>
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              <InfoTile label="Avg price" value={formatMoney(item.avg_price || item.avg_listing_price || 0)} />
              <InfoTile label="Trend" value={(item.trend || item.market_trend || 'balanced').toString()} />
              <InfoTile label="Signal" value={item.signal || 'BUY_NOW'} />
            </div>

            <div className="mt-4 flex items-center justify-between rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-gray-300">
              <span>Coordinates: {Number(item.centroid_lat || 0).toFixed(3)} / {Number(item.centroid_lon || 0).toFixed(3)}</span>
              <button className="inline-flex items-center gap-2 text-[#FFB38F] transition hover:text-white">
                Shortlist <ArrowRight size={16} />
              </button>
            </div>
          </article>
        ))}
      </div>

      <div className="rounded-3xl border border-white/10 bg-black/20 p-5 text-sm text-gray-300">
        <div className="flex items-center gap-2 text-white">
          <Target size={16} className="text-[#FFB38F]" />
          <p className="font-semibold">Decision logic</p>
        </div>
        <p className="mt-2 leading-6">
          Only opportunities above the shortlist threshold appear here, so the page stays focused on likely capital candidates rather than broad exploration noise.
        </p>
      </div>
    </section>
  );
}

function InfoTile({ label, value }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
      <p className="text-xs uppercase tracking-[0.18em] text-gray-400">{label}</p>
      <p className="mt-1 font-semibold text-white">{value}</p>
    </div>
  );
}