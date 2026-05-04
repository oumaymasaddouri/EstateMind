import React from 'react';
import { Filter, Search, Target, Zap } from 'lucide-react';
import { getMapOpportunities } from '../../services/api';
import { FALLBACK_OPPORTUNITIES, formatMoney, formatPercent, normalizeOpportunities } from './workspace';

export default function InvestScannerPage() {
  const [opportunities, setOpportunities] = React.useState(FALLBACK_OPPORTUNITIES);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState('');

  React.useEffect(() => {
    const loadOpportunities = async () => {
      setLoading(true);
      setError('');
      try {
        const response = await getMapOpportunities({ min_score: 0 });
        setOpportunities(normalizeOpportunities(response.data));
      } catch (requestError) {
        setError('Live scanner data is unavailable. Showing a curated investor fallback set.');
        setOpportunities(FALLBACK_OPPORTUNITIES);
      } finally {
        setLoading(false);
      }
    };

    loadOpportunities();
  }, []);

  return (
    <section className="space-y-6 p-5 md:p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-[#FFB38F]">
            <Target size={18} />
            <p className="text-xs font-semibold uppercase tracking-[0.22em]">Scanner</p>
          </div>
          <h3 className="mt-2 text-2xl font-black text-white">Investment Scanner</h3>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-gray-300">
            Rank delegations by opportunity intensity so capital can move toward the most efficient areas first.
          </p>
        </div>

        <div className="flex gap-3">
          <button className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-semibold text-white transition hover:border-white/20 hover:bg-white/10">
            <Search size={16} />
            Scan all
          </button>
          <button className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-semibold text-white transition hover:border-white/20 hover:bg-white/10">
            <Filter size={16} />
            Filters
          </button>
        </div>
      </div>

      {error ? (
        <div className="rounded-2xl border border-[#FF6B35]/30 bg-[#FF6B35]/10 p-4 text-sm text-gray-100">
          {error}
        </div>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {opportunities.slice(0, 4).map((item, index) => (
          <div key={`${item.delegation || index}-${index}`} className="rounded-2xl border border-white/10 bg-black/20 p-4">
            <p className="text-xs uppercase tracking-[0.2em] text-gray-400">{item.region || 'Tunisia'}</p>
            <div className="mt-2 flex items-center justify-between gap-4">
              <h4 className="text-lg font-bold text-white">{item.delegation || item.name || 'Opportunity'}</h4>
              <span className="rounded-full bg-[#FF6B35]/10 px-3 py-1 text-sm font-semibold text-[#FFB38F]">
                {formatPercent(item.opportunity_score || item.score || 0, 1)}
              </span>
            </div>
            <p className="mt-3 text-sm text-gray-400">Latitude {Number(item.centroid_lat || 0).toFixed(3)} · Longitude {Number(item.centroid_lon || 0).toFixed(3)}</p>
            <p className="mt-2 text-sm text-gray-300">Average price: {formatMoney(item.avg_price || item.avg_listing_price || 0)}</p>
          </div>
        ))}
      </div>

      <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
        <div className="flex items-center justify-between gap-3 border-b border-white/10 pb-4">
          <div>
            <h4 className="text-lg font-bold text-white">Delegation ranking</h4>
            <p className="text-sm text-gray-400">Sorted by opportunity intensity and ready for shortlist work.</p>
          </div>
          <div className="rounded-full border border-white/10 bg-black/20 px-3 py-1 text-xs text-gray-300">
            {loading ? 'Loading data...' : `${opportunities.length} areas scored`}
          </div>
        </div>

        <div className="mt-4 space-y-3">
          {opportunities.map((item, index) => (
            <article key={`${item.delegation || index}-${index}-row`} className="rounded-2xl border border-white/10 bg-black/20 p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="font-semibold text-white">{item.delegation || item.name || 'Untitled delegation'}</p>
                  <p className="text-xs text-gray-400">{item.region || 'Unknown region'}</p>
                </div>
                <div className="flex items-center gap-2 text-[#FFB38F]">
                  <Zap size={15} />
                  <span className="font-semibold">{formatPercent(item.opportunity_score || item.score || 0, 1)}</span>
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}