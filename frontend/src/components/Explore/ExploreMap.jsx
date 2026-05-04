import React, { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { getClimateRiskMap, getMapDemandHeat, getMapOpportunities, getMapPriceHeat } from '../../services/api';

const DEFAULT_CENTER = [34.0, 9.0];
const DEFAULT_ZOOM   = 6;
const TUNISIA_BOUNDS = L.latLngBounds([30.0, 7.5], [37.5, 11.7]);

const CITIES = [
  { name: 'Tunis',      lat: 36.8065, lng: 10.1815 },
  { name: 'Sfax',       lat: 34.7406, lng: 10.7603 },
  { name: 'Sousse',     lat: 35.8245, lng: 10.6346 },
  { name: 'Kairouan',   lat: 35.6773, lng: 10.1008 },
  { name: 'Bizerte',    lat: 37.2746, lng:  9.8739 },
  { name: 'Gabès',      lat: 33.8846, lng: 10.0982 },
  { name: 'Gafsa',      lat: 34.4234, lng:  8.7802 },
  { name: 'Monastir',   lat: 35.7643, lng: 10.8113 },
  { name: 'Nabeul',     lat: 36.4561, lng: 10.7376 },
  { name: 'Médenine',   lat: 33.3542, lng: 10.5052 },
  { name: 'Tataouine',  lat: 32.9211, lng: 10.4514 },
  { name: 'Beja',       lat: 36.7326, lng:  9.1817 },
  { name: 'Jendouba',   lat: 36.5011, lng:  8.7757 },
  { name: 'El Kef',     lat: 36.1822, lng:  8.7149 },
  { name: 'Mahdia',     lat: 35.5046, lng: 11.0622 },
  { name: 'Sidi Bouzid',lat: 35.0382, lng:  9.4858 },
  { name: 'Tozeur',     lat: 33.9197, lng:  8.1335 },
  { name: 'Siliana',    lat: 36.0851, lng:  9.3708 },
  { name: 'Zaghouan',   lat: 36.4012, lng: 10.1429 },
  { name: 'Kebili',     lat: 33.7045, lng:  8.9687 },
  { name: 'Kasserine',  lat: 35.1677, lng:  8.8311 },
];

const LAYER_LABELS = {
  price:         'Price Zones',
  demand:        'Demand Heat',
  opportunities: 'Opportunities',
  climate:       'Climate Risk',
};

// Simple pin marker — no price shown
function pinIcon(isSelected) {
  const bg     = '#FF6B35';
  const border = isSelected ? '#fff' : 'rgba(255,255,255,0.7)';
  const size   = isSelected ? 16 : 10;
  return L.divIcon({
    className: '',
    html: `<div style="width:${size}px;height:${size}px;background:${bg};border:2.5px solid ${border};border-radius:50%;transform:translate(-50%,-50%);box-shadow:0 2px 8px rgba(255,107,53,0.5);transition:all .15s"></div>`,
    iconSize:   [0, 0],
    iconAnchor: [0, 0],
  });
}

// City label on light basemap
function cityIcon(name) {
  return L.divIcon({
    className: '',
    html: `<div style="display:flex;flex-direction:column;align-items:center;transform:translate(-50%,-100%);pointer-events:none">
      <div style="width:5px;height:5px;background:#6b7280;border:1px solid #fff;border-radius:50%;"></div>
      <div style="background:rgba(255,255,255,0.92);color:#374151;font-size:9px;font-weight:700;padding:1px 5px;border-radius:3px;white-space:nowrap;margin-top:1px;border:1px solid rgba(107,114,128,0.25);letter-spacing:0.03em">${name}</div>
    </div>`,
    iconSize:   [0, 0],
    iconAnchor: [0, 0],
  });
}

function climateColor(riskCategory) {
  const cat = (riskCategory || '').toLowerCase();
  if (cat === 'low')                          return '#22c55e';
  if (cat === 'moderate' || cat === 'medium') return '#eab308';
  if (cat === 'high')                         return '#f97316';
  if (cat.includes('very') || cat === 'extreme') return '#dc2626';
  return '#94a3b8';
}

export default function ExploreMap({
  selectedProperty,
  properties = [],
  onPropertySelect,
  mapLayer,
  onLayerChange,
  filters,
  onFilterChange,
  governorateOptions = [],
  delegationOptions  = [],
  loading,
}) {
  const mapRef      = useRef(null);
  const instanceRef = useRef(null);
  const markerLayer = useRef(null);
  const heatLayer   = useRef(null);

  // ── Init map once ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (!mapRef.current || instanceRef.current) return undefined;

    const map = L.map(mapRef.current, {
      center:    DEFAULT_CENTER,
      zoom:      DEFAULT_ZOOM,
      maxBounds: TUNISIA_BOUNDS.pad(0.25),
      minZoom:   5,
      maxZoom:   18,
      zoomControl: false,
    });

    // Light basemap (CartoDB Positron) — clean, professional
    L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a> &copy; <a href="https://carto.com/">CARTO</a>',
      subdomains:  'abcd',
      maxZoom:     20,
    }).addTo(map);

    L.control.zoom({ position: 'bottomright' }).addTo(map);

    markerLayer.current = L.layerGroup().addTo(map);
    heatLayer.current   = L.layerGroup().addTo(map);

    // Permanent city labels
    CITIES.forEach((c) => {
      L.marker([c.lat, c.lng], { icon: cityIcon(c.name), interactive: false }).addTo(map);
    });

    instanceRef.current = map;
    return () => {
      map.remove();
      instanceRef.current = null;
      markerLayer.current = null;
      heatLayer.current   = null;
    };
  }, []);

  // ── Property pin markers ───────────────────────────────────────────────────
  useEffect(() => {
    const map  = instanceRef.current;
    const ml   = markerLayer.current;
    if (!map || !ml) return;

    ml.clearLayers();

    properties.forEach((p) => {
      const lat = Number(p.lat);
      const lng = Number(p.lng);
      if (!lat || !lng) return;

      const isSelected = selectedProperty?.id === p.id;
      const marker = L.marker([lat, lng], {
        icon:        pinIcon(isSelected),
        zIndexOffset: isSelected ? 1000 : 0,
      });

      marker.bindTooltip(
        `<b>${p.title || 'Property'}</b><br/>${(p.price || 0).toLocaleString('fr-TN')} TND — ${p.location || ''}`,
        { direction: 'top', className: 'leaflet-light-tip' }
      );

      // Click → centered React modal only (no Leaflet popup)
      marker.on('click', () => { if (onPropertySelect) onPropertySelect(p); });
      marker.addTo(ml);
    });

    if (selectedProperty?.lat && selectedProperty?.lng) {
      map.setView([selectedProperty.lat, selectedProperty.lng], Math.max(instanceRef.current?.getZoom() || 9, 11));
    }
  }, [properties, selectedProperty, onPropertySelect]);

  // ── Overlay layers ─────────────────────────────────────────────────────────
  useEffect(() => {
    let ignore = false;
    const hl = heatLayer.current;
    if (!hl) return;
    hl.clearLayers();

    const draw = async () => {
      try {
        if (mapLayer === 'climate') {
          const { data } = await getClimateRiskMap();
          if (ignore) return;
          (Array.isArray(data) ? data : []).forEach((item) => {
            // Use model lat/lon first, fall back to region lat/lon
            const lat = Number(item.lat || item.region_lat || 0);
            const lon = Number(item.lon || item.region_lon || 0);
            if (!lat || !lon) return;
            const color = climateColor(item.risk_category);
            L.circleMarker([lat, lon], {
              radius: 22, color, fillColor: color, fillOpacity: 0.28, weight: 2.5,
            })
              .bindTooltip(
                `<b>${item.governorate}</b><br/>Climate Risk: <b>${item.risk_category || 'N/A'}</b>`,
                { direction: 'top', className: 'leaflet-light-tip' }
              )
              .addTo(hl);
          });
          return;
        }

        if (mapLayer === 'opportunities') {
          const { data } = await getMapOpportunities({ min_score: 50 });
          if (ignore) return;
          (Array.isArray(data) ? data : []).forEach((item) => {
            const lat = Number(item.centroid_lat || 0);
            const lon = Number(item.centroid_lon || 0);
            if (!lat || !lon) return;
            const score = Number(item.opportunity_score || 0);
            const color = score > 80 ? '#16a34a' : score > 65 ? '#d97706' : '#dc2626';
            L.circleMarker([lat, lon], {
              radius: 11, color, fillColor: color, fillOpacity: 0.55, weight: 2,
            })
              .bindTooltip(
                `<b>${item.delegation_name || 'Delegation'}</b><br/>Opportunity score: <b>${score}</b>`,
                { direction: 'top', className: 'leaflet-light-tip' }
              )
              .addTo(hl);
          });
          return;
        }

        const fetchFn = mapLayer === 'demand' ? getMapDemandHeat : getMapPriceHeat;
        const { data: payload } = await fetchFn();
        if (ignore) return;

        (payload?.features || []).forEach((feature) => {
          const coords    = feature?.geometry?.coordinates || [];
          const p         = feature.properties || {};
          const lon       = Number(coords[0] || 0);
          const lat       = Number(coords[1] || 0);
          if (!lat || !lon) return;
          const intensity = Number(p.intensity || 0);
          L.circle([lat, lon], {
            radius:      4500 + intensity * 8000,
            color:       p.color || '#FF6B35',
            fillColor:   p.color || '#FF6B35',
            fillOpacity: 0.12 + intensity * 0.22,
            weight: 1.5,
          })
            .bindTooltip(
              `<b>${p.delegation_name || 'Delegation'}</b><br/>${
                mapLayer === 'demand'
                  ? `Supply pressure: ${p.supply_pressure}`
                  : `Avg. price: ${(p.avg_price_tnd || 0).toLocaleString('fr-TN')} TND`
              }`,
              { direction: 'top', className: 'leaflet-light-tip' }
            )
            .addTo(hl);
        });
      } catch {
        hl.clearLayers();
      }
    };

    draw();
    return () => { ignore = true; };
  }, [mapLayer]);

  const mappedCount = properties.filter((p) => p.lat && p.lng).length;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="w-full rounded-xl overflow-hidden border border-slate-200/20 shadow-2xl shadow-black/30 relative"
      style={{ height: 560 }}
    >
      {/* ── Top controls ── */}
      <div className="absolute top-3 left-3 right-3 z-[1000] flex flex-wrap items-center gap-2">
        <select
          value={filters.governorate}
          onChange={(e) => onFilterChange({ governorate: e.target.value })}
          className="px-3 py-2 rounded-lg bg-white/90 text-gray-800 border border-gray-300 text-sm shadow-sm backdrop-blur-sm focus:outline-none"
        >
          <option value="">All Governorates</option>
          {governorateOptions.map((g) => <option key={g} value={g}>{g}</option>)}
        </select>

        <select
          value={filters.delegation}
          onChange={(e) => onFilterChange({ delegation: e.target.value })}
          className="px-3 py-2 rounded-lg bg-white/90 text-gray-800 border border-gray-300 text-sm shadow-sm backdrop-blur-sm focus:outline-none"
        >
          <option value="">All Delegations</option>
          {delegationOptions.map((d) => <option key={d} value={d}>{d}</option>)}
        </select>

        <div className="ml-auto flex items-center gap-1 bg-white/90 border border-gray-200 rounded-lg p-1 shadow-sm backdrop-blur-sm">
          {Object.entries(LAYER_LABELS).map(([key, label]) => (
            <button
              key={key}
              onClick={() => onLayerChange(key)}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                mapLayer === key
                  ? key === 'climate' ? 'bg-emerald-500 text-white' : 'bg-[#FF6B35] text-white'
                  : 'text-gray-500 hover:text-gray-800 hover:bg-gray-100'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Map canvas ── */}
      <div ref={mapRef} className="w-full h-full" />

      {/* ── Bottom left status ── */}
      <div className="absolute bottom-3 left-3 z-[1000] flex items-center gap-2">
        <div className="bg-white/90 border border-gray-200 rounded-lg px-3 py-2 text-xs text-gray-600 shadow-sm backdrop-blur-sm">
          <span className={`font-semibold ${mapLayer === 'climate' ? 'text-emerald-600' : 'text-[#FF6B35]'}`}>
            {LAYER_LABELS[mapLayer]}
          </span>
          {loading && <span className="ml-2 text-gray-400">· loading…</span>}
        </div>

        {mapLayer === 'climate' && (
          <div className="bg-white/90 border border-gray-200 rounded-lg px-3 py-2 text-xs shadow-sm backdrop-blur-sm flex items-center gap-3">
            {[['#22c55e','Low'],['#eab308','Moderate'],['#f97316','High'],['#dc2626','Very High']].map(([color, label]) => (
              <span key={label} className="flex items-center gap-1.5">
                <span style={{ background: color }} className="inline-block w-2.5 h-2.5 rounded-full" />
                <span className="text-gray-600">{label}</span>
              </span>
            ))}
          </div>
        )}
      </div>

      {/* ── Bottom right count ── */}
      {properties.length > 0 && (
        <div className="absolute bottom-3 right-12 z-[1000] bg-white/90 border border-gray-200 rounded-lg px-3 py-2 text-xs text-gray-500 shadow-sm backdrop-blur-sm">
          <span className="text-[#FF6B35] font-bold">{mappedCount}</span> / {properties.length} mapped
        </div>
      )}

      <style>{`
        .leaflet-light-tip {
          background: rgba(255,255,255,0.97) !important;
          border: 1px solid rgba(203,213,225,0.8) !important;
          color: #1e293b !important;
          font-size: 12px !important;
          border-radius: 8px !important;
          padding: 6px 10px !important;
          box-shadow: 0 4px 14px rgba(0,0,0,0.12) !important;
        }
        .leaflet-tooltip-top.leaflet-light-tip::before { border-top-color: rgba(203,213,225,0.8) !important; }
      `}</style>
    </motion.div>
  );
}
