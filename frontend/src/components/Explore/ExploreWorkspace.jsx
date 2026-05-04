import React, { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import ExploreMap from './ExploreMap';
import PropertyList from './PropertyList';
import PropertyDetailModal from './PropertyDetailModal';
import { getMapDelegations, getMapListings } from '../../services/api';

const TN_LAT_MIN = 30.0, TN_LAT_MAX = 37.5, TN_LNG_MIN = 7.5, TN_LNG_MAX = 11.7;

function inTunisia(lat, lng) {
  return lat >= TN_LAT_MIN && lat <= TN_LAT_MAX && lng >= TN_LNG_MIN && lng <= TN_LNG_MAX;
}

function resolveCoords(raw) {
  const propLat = Number(raw.latitude || 0);
  const propLng = Number(raw.longitude || 0);
  if (propLat && propLng && inTunisia(propLat, propLng)) return { lat: propLat, lng: propLng };

  const delLat = Number(raw.delegation_centroid_lat || 0);
  const delLng = Number(raw.delegation_centroid_lon || 0);
  if (delLat && delLng && inTunisia(delLat, delLng)) return { lat: delLat, lng: delLng };

  const regLat = Number(raw.region_lat || 0);
  const regLng = Number(raw.region_lon || 0);
  if (regLat && regLng && inTunisia(regLat, regLng)) return { lat: regLat, lng: regLng };

  return { lat: null, lng: null };
}

function normalizeProperty(raw) {
  const location = [raw.governorate, raw.delegation_name].filter(Boolean).join(', ');
  const bedrooms = Number(raw.bedrooms || 0);
  const rooms = bedrooms > 0 ? bedrooms : Math.max(1, Math.round(Number(raw.area_sqm || 0) / 45));
  const { lat, lng } = resolveCoords(raw);
  const price = Number(raw.price || 0);
  const area = Number(raw.area_sqm || 0);

  return {
    id: raw.id,
    external_id: raw.external_id,
    title: raw.title,
    price,
    pricePerM2: area > 0 ? Math.round(price / area) : null,
    type: raw.property_type ? raw.property_type[0].toUpperCase() + raw.property_type.slice(1) : 'Property',
    property_type: raw.property_type,
    area,
    rooms,
    bathrooms: Number(raw.bathrooms || 0),
    bedrooms,
    location: location || 'Tunisia',
    lat,
    lng,
    source: raw.source,
    governorate: raw.governorate,
    delegationName: raw.delegation_name,
    image: '/images/property_listing_placeholder.png',
    deal: price < 300000 ? 'good' : price < 600000 ? 'fair' : 'above',
    tags: [raw.property_type, raw.source].filter(Boolean),
  };
}

export default function ExploreWorkspace() {
  const [selectedProperty, setSelectedProperty] = useState(null);
  const [detailProperty, setDetailProperty] = useState(null);
  const [properties, setProperties] = useState([]);
  const [delegationKpis, setDelegationKpis] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [mapLayer, setMapLayer] = useState('price');
  const [filters, setFilters] = useState({
    governorate: '',
    delegation: '',
    property_type: '',
    price_min: '',
    price_max: '',
  });

  const governorateOptions = useMemo(() => {
    return [...new Set(delegationKpis.map((item) => item.governorate).filter(Boolean))].sort();
  }, [delegationKpis]);

  const delegationOptions = useMemo(() => {
    return delegationKpis
      .filter((item) => !filters.governorate || item.governorate === filters.governorate)
      .map((item) => item.delegation_name)
      .filter(Boolean)
      .sort((a, b) => a.localeCompare(b));
  }, [delegationKpis, filters.governorate]);

  useEffect(() => {
    let ignore = false;

    const fetchDelegations = async () => {
      try {
        const params = filters.governorate ? { governorate: filters.governorate } : undefined;
        const { data } = await getMapDelegations(params);
        if (!ignore) {
          setDelegationKpis(Array.isArray(data) ? data : []);
        }
      } catch (err) {
        if (!ignore) {
          setDelegationKpis([]);
        }
      }
    };

    fetchDelegations();
    return () => {
      ignore = true;
    };
  }, [filters.governorate]);

  useEffect(() => {
    let ignore = false;

    const fetchListings = async () => {
      setLoading(true);
      setError('');

      try {
        const params = {};
        if (filters.governorate) params.governorate = filters.governorate;
        if (filters.delegation) params.delegation = filters.delegation;
        if (filters.property_type) params.property_type = filters.property_type;
        if (filters.price_min !== '') params.price_min = filters.price_min;
        if (filters.price_max !== '') params.price_max = filters.price_max;

        const { data } = await getMapListings(params);
        const normalized = (data?.results || []).map(normalizeProperty);

        if (!ignore) {
          setProperties(normalized);
          setSelectedProperty((prev) => {
            if (!prev) return null;
            return normalized.find((p) => p.id === prev.id) || null;
          });
        }
      } catch (err) {
        if (!ignore) {
          setProperties([]);
          setError('Unable to load listings from backend map API.');
        }
      } finally {
        if (!ignore) setLoading(false);
      }
    };

    fetchListings();
    return () => {
      ignore = true;
    };
  }, [filters]);

  const handleFilterChange = (patch) => {
    setFilters((prev) => {
      const next = { ...prev, ...patch };
      if (patch.governorate !== undefined && patch.governorate !== prev.governorate) {
        next.delegation = '';
      }
      return next;
    });
  };

  const handleMapPropertySelect = (property) => {
    setSelectedProperty(property);
    setDetailProperty(property);
  };

  return (
    <section className="relative bg-gradient-to-b from-black via-slate-950 to-black py-12 px-6">
      <div className="max-w-7xl mx-auto">
        {/* Workspace Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true, margin: '-100px' }}
          className="mb-12"
        >
          <div className="text-orange-500/60 font-mono text-sm tracking-widest mb-3 uppercase">
            — Workspace
          </div>
          <h2 className="text-4xl md:text-5xl font-black text-white mb-3">
            Intelligence <span className="text-[#FF6B35]">Workspace</span>
          </h2>
          <p className="text-gray-400 text-lg max-w-2xl">
            Browse properties with structured filters, live map synchronization, and clear decision support.
          </p>
        </motion.div>

        {/* Workspace Content Container */}
        <div className="space-y-8">
          {/* Map Section */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            viewport={{ once: true, margin: '-100px' }}
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="w-1 h-6 bg-gradient-to-b from-[#FF6B35] to-[#FF6B35]/40 rounded" />
              <h3 className="text-lg font-black text-white">Live Market Map</h3>
              <div className="flex-1 h-px bg-gradient-to-r from-slate-700 to-transparent" />
            </div>
            <ExploreMap
              properties={properties}
              selectedProperty={selectedProperty}
              onPropertySelect={handleMapPropertySelect}
              mapLayer={mapLayer}
              onLayerChange={setMapLayer}
              filters={filters}
              onFilterChange={handleFilterChange}
              governorateOptions={governorateOptions}
              delegationOptions={delegationOptions}
              loading={loading}
            />
          </motion.div>

          {/* Properties Section */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            viewport={{ once: true, margin: '-100px' }}
          >
            <div className="flex items-center gap-3 mb-6">
              <div className="w-1 h-6 bg-gradient-to-b from-[#FF6B35] to-[#FF6B35]/40 rounded" />
              <h3 className="text-lg font-black text-white">Discovery List</h3>
              <div className="flex-1 h-px bg-gradient-to-r from-slate-700 to-transparent" />
            </div>
            <PropertyList
              properties={properties}
              selectedProperty={selectedProperty}
              onViewDetails={setDetailProperty}
              onPropertySelect={setSelectedProperty}
              filters={filters}
              onFilterChange={handleFilterChange}
              loading={loading}
              error={error}
            />
          </motion.div>
        </div>

        {/* Bottom Accent */}
        <motion.div
          initial={{ opacity: 0, scaleX: 0 }}
          whileInView={{ opacity: 1, scaleX: 1 }}
          transition={{ duration: 0.8, delay: 0.4 }}
          viewport={{ once: true, margin: '-100px' }}
          className="mt-16 h-1 w-full bg-gradient-to-r from-transparent via-[#FF6B35]/30 to-transparent rounded-full"
        />

        {/* Property Detail Modal */}
        <PropertyDetailModal
          property={detailProperty}
          isOpen={!!detailProperty}
          onClose={() => setDetailProperty(null)}
        />
      </div>
    </section>
  );
}
