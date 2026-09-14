'use client';

import { useState, useCallback } from 'react';
import { apiFetch } from '@/lib/apiFetch';
import { LOCALITIES } from '@/lib/constants';
import { PropertyCard, SkeletonCards } from '@/components/Cards';
import Pagination from '@/components/Pagination';
import { useEffect } from 'react';

const DEFAULT_FILTER = {
  locality: '', bhk: '', property_type: '', furnishing: '',
  min_price: '', max_price: '', sort_by: 'posted_at', order: 'desc',
  offset: 0, limit: 12,
};

export default function ListingsPage() {
  const [filter, setFilter]   = useState(DEFAULT_FILTER);
  const [data, setData]       = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchListings = useCallback(async (f) => {
    setLoading(true);
    try {
      const q = new URLSearchParams();
      if (f.locality)      q.append('locality',      f.locality);
      if (f.bhk)           q.append('bhk',           f.bhk);
      if (f.property_type) q.append('property_type', f.property_type);
      if (f.furnishing)    q.append('furnishing',     f.furnishing);
      if (f.min_price)     q.append('min_price',      f.min_price);
      if (f.max_price)     q.append('max_price',      f.max_price);
      q.append('sort_by', f.sort_by);
      q.append('order',   f.order);
      q.append('offset',  f.offset);
      q.append('limit',   f.limit);
      const res = await apiFetch(`/api/listings?${q}`);
      if (res && res.ok) setData(await res.json());
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchListings(filter); }, []);

  const applyFilter = (updates) => {
    const next = { ...filter, ...updates, offset: 0 };
    setFilter(next);
    fetchListings(next);
  };

  const onSortChange = (val) => {
    const [sort_by, order] = val.split(':');
    applyFilter({ sort_by, order });
  };

  const reset = () => {
    const next = { ...DEFAULT_FILTER };
    setFilter(next);
    fetchListings(next);
  };

  const activeFilters = [filter.locality, filter.bhk, filter.property_type, filter.furnishing, filter.min_price, filter.max_price].filter(Boolean).length;

  return (
    <>
      <div className="hero-section">
        <div className="hero-eyebrow">🌿 Bangalore Real Estate · {new Date().getFullYear()}</div>
        <h1 className="hero-title">Discover Your Perfect Home</h1>
        <p className="hero-subtitle">Verified listings with accurate carpet areas, real prices, and fraud-free properties across Bangalore&apos;s prime localities.</p>
      </div>

      {/* Filter Bar */}
      <div className="glass-card filter-bar">
        <div className="filter-group">
          <label className="filter-label">📍 Locality</label>
          <select id="filter-locality" value={filter.locality} onChange={e => applyFilter({ locality: e.target.value })}>
            {LOCALITIES.map(l => <option key={l.value} value={l.value}>{l.label}</option>)}
          </select>
        </div>
        <div className="filter-group">
          <label className="filter-label">🛏 Bedrooms</label>
          <select id="filter-bhk" value={filter.bhk} onChange={e => applyFilter({ bhk: e.target.value })}>
            <option value="">Any BHK</option>
            {[1,2,3,4,5].map(n => <option key={n} value={n}>{n}{n===5?'+':''} BHK</option>)}
          </select>
        </div>
        <div className="filter-group">
          <label className="filter-label">🏘 Type</label>
          <select id="filter-pt" value={filter.property_type} onChange={e => applyFilter({ property_type: e.target.value })}>
            <option value="">All Types</option>
            <option value="apartment">Apartment</option>
            <option value="villa">Villa</option>
            <option value="independent house">Independent House</option>
            <option value="builder floor">Builder Floor</option>
            <option value="plot">Plot</option>
          </select>
        </div>
        <div className="filter-group">
          <label className="filter-label">🛋 Furnishing</label>
          <select id="filter-furnishing" value={filter.furnishing} onChange={e => applyFilter({ furnishing: e.target.value })}>
            <option value="">Any Furnishing</option>
            <option value="unfurnished">Unfurnished</option>
            <option value="semi-furnished">Semi-Furnished</option>
            <option value="fully-furnished">Fully-Furnished</option>
          </select>
        </div>
        <div className="filter-group" style={{ minWidth: 120 }}>
          <label className="filter-label">💰 Min Price (₹)</label>
          <select id="filter-min-price" value={filter.min_price} onChange={e => applyFilter({ min_price: e.target.value })}>
            <option value="">No Min</option>
            <option value="1000000">₹10 L+</option>
            <option value="2500000">₹25 L+</option>
            <option value="5000000">₹50 L+</option>
            <option value="10000000">₹1 Cr+</option>
            <option value="20000000">₹2 Cr+</option>
            <option value="50000000">₹5 Cr+</option>
          </select>
        </div>
        <div className="filter-group" style={{ minWidth: 120 }}>
          <label className="filter-label">💰 Max Price (₹)</label>
          <select id="filter-max-price" value={filter.max_price} onChange={e => applyFilter({ max_price: e.target.value })}>
            <option value="">No Max</option>
            <option value="2500000">Up to ₹25 L</option>
            <option value="5000000">Up to ₹50 L</option>
            <option value="10000000">Up to ₹1 Cr</option>
            <option value="20000000">Up to ₹2 Cr</option>
            <option value="50000000">Up to ₹5 Cr</option>
            <option value="100000000">Up to ₹10 Cr</option>
          </select>
        </div>
        <div className="filter-group">
          <label className="filter-label">↕ Sort</label>
          <select id="filter-sort" value={`${filter.sort_by}:${filter.order}`} onChange={e => onSortChange(e.target.value)}>
            <option value="posted_at:desc">Latest Listed</option>
            <option value="price:asc">Price: Low → High</option>
            <option value="price:desc">Price: High → Low</option>
            <option value="carpet_area:desc">Largest Area First</option>
            <option value="bedroom:desc">Most Bedrooms</option>
          </select>
        </div>
        <div className="filter-group" style={{ flex: 0, minWidth: 'auto', justifyContent: 'flex-end' }}>
          <label className="filter-label" style={{ visibility: 'hidden' }}>Reset</label>
          <button
            id="reset-filters-btn"
            className="btn btn-ghost btn-sm"
            onClick={reset}
            style={{
              border: '1px solid var(--border-color)',
              whiteSpace: 'nowrap',
              color: activeFilters ? 'var(--accent)' : '',
              borderColor: activeFilters ? 'rgba(34,211,165,0.4)' : '',
            }}
          >
            ✕ Reset {activeFilters > 0 && (
              <span style={{ background: 'var(--accent)', color: '#022c20', borderRadius: 99, padding: '1px 6px', fontSize: '0.7rem', fontWeight: 800, marginLeft: 4 }}>
                {activeFilters}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Count label */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
        <span style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
          {data
            ? <>Showing <strong style={{ color: 'var(--text-primary)' }}>{data.results.length}</strong> of <strong style={{ color: 'var(--accent)' }}>{data.total.toLocaleString()}</strong> verified active properties</>
            : 'Loading listings…'}
        </span>
        <div style={{ display: 'flex', gap: 8 }}>
          <span className="chip green">✓ Fraud-filtered</span>
          <span className="chip indigo">📐 Area-corrected</span>
        </div>
      </div>

      {/* Grid */}
      <div id="listings-grid" className="property-grid">
        {loading
          ? <SkeletonCards count={12} />
          : data?.results?.length === 0
            ? (
              <div className="empty-state">
                <div className="empty-state-icon">🔍</div>
                <div className="empty-state-title">No properties found</div>
                <div className="empty-state-sub">Try adjusting your filters.</div>
              </div>
            )
            : data?.results?.map(l => <PropertyCard key={l.listing_id} listing={l} />)
        }
      </div>

      {/* Pagination */}
      {data && (
        <Pagination
          total={data.total}
          offset={filter.offset}
          limit={filter.limit}
          onPageChange={(newOffset) => {
            const next = { ...filter, offset: newOffset };
            setFilter(next);
            fetchListings(next);
            window.scrollTo({ top: 280, behavior: 'smooth' });
          }}
        />
      )}
    </>
  );
}
