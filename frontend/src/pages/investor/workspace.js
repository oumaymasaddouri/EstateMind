import { Briefcase, Building2, ShieldAlert, Sparkles, Target } from 'lucide-react';

export const INVEST_SECTIONS = [
  { label: 'Portfolio', path: '/invest/portfolio', icon: Briefcase, description: 'Holdings overview' },
  { label: 'Scanner', path: '/invest/scanner', icon: Target, description: 'Live deal screening' },
  { label: 'Opportunities', path: '/invest/opportunities', icon: Sparkles, description: 'Ranked opportunities' },
  { label: 'Risk', path: '/invest/risk', icon: ShieldAlert, description: 'Portfolio exposure' },
  { label: 'Assets', path: '/invest/assets', icon: Building2, description: 'Add and manage assets' },
];

export const FALLBACK_PORTFOLIO = [
  { property_name: 'Lac 2 Apartment', purchase_price: 195000, current_value: 242000, monthly_rent: 1250, created_at: '2026-04-28T09:00:00Z' },
  { property_name: 'Sousse Villa', purchase_price: 310000, current_value: 348000, monthly_rent: 2100, created_at: '2026-04-19T10:00:00Z' },
  { property_name: 'Ariana Commercial Unit', purchase_price: 280000, current_value: 322000, monthly_rent: 2650, created_at: '2026-04-11T08:30:00Z' },
];

export const FALLBACK_OPPORTUNITIES = [
  { delegation: 'La Soukra', region: 'Ariana', opportunity_score: 84.1, centroid_lat: 36.876, centroid_lon: 10.184, avg_price: 385000, trend: 'accelerating' },
  { delegation: 'Mrezga', region: 'Nabeul', opportunity_score: 78.3, centroid_lat: 36.668, centroid_lon: 10.638, avg_price: 275000, trend: 'steady' },
  { delegation: 'El Mourouj', region: 'Ben Arous', opportunity_score: 71.9, centroid_lat: 36.706, centroid_lon: 10.246, avg_price: 198000, trend: 'value' },
  { delegation: 'Sahloul', region: 'Sousse', opportunity_score: 68.4, centroid_lat: 35.843, centroid_lon: 10.606, avg_price: 245000, trend: 'balanced' },
];

export function formatMoney(value) {
  const amount = Number(value || 0);
  return `${amount.toLocaleString()} TND`;
}

export function formatPercent(value, digits = 1) {
  const amount = Number(value || 0);
  return `${amount.toFixed(digits)}%`;
}

export function computeAssetReturn(asset) {
  const purchase = Number(asset?.purchase_price || 0);
  const current = Number(asset?.current_value || 0);
  const rent = Number(asset?.monthly_rent || 0);
  const gain = current - purchase;
  const roi = purchase > 0 ? (gain / purchase) * 100 : 0;
  const yieldPercent = purchase > 0 ? ((rent * 12) / purchase) * 100 : 0;
  return { gain, roi, yieldPercent };
}

export function aggregatePortfolio(portfolio) {
  const assets = Array.isArray(portfolio) ? portfolio : [];
  const totals = assets.reduce(
    (acc, asset) => {
      const { gain, roi, yieldPercent } = computeAssetReturn(asset);
      acc.purchase += Number(asset?.purchase_price || 0);
      acc.current += Number(asset?.current_value || 0);
      acc.rent += Number(asset?.monthly_rent || 0);
      acc.gain += gain;
      acc.roi += roi;
      acc.yieldPercent += yieldPercent;
      return acc;
    },
    { purchase: 0, current: 0, rent: 0, gain: 0, roi: 0, yieldPercent: 0 },
  );

  const count = assets.length || 1;
  return {
    totalPurchase: totals.purchase,
    totalCurrent: totals.current,
    totalGain: totals.gain,
    averageRoi: totals.roi / count,
    averageYield: totals.yieldPercent / count,
    annualRent: totals.rent * 12,
  };
}

export function normalizeOpportunities(payload) {
  if (Array.isArray(payload)) {
    return payload;
  }

  if (Array.isArray(payload?.results)) {
    return payload.results;
  }

  if (Array.isArray(payload?.data)) {
    return payload.data;
  }

  return FALLBACK_OPPORTUNITIES;
}