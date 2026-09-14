'use client';

import { useState, useCallback, useEffect } from 'react';
import { apiFetch } from '@/lib/apiFetch';
import { LOCALITIES, LOCALITY_COLORS } from '@/lib/constants';
import { SkeletonCards } from '@/components/Cards';
import Pagination from '@/components/Pagination';

const DEFAULT_FILTER = {
  locality: '', bhk: '', furnishing: '',
  sort_by: 'price', order: 'asc', offset: 0, limit: 12,
};

export default function RentalsPage() {
  const [filter, setFilter]   = useState(DEFAULT_FILTER);
  const [data, setData]       = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchRentals = useCallback(async (f) => {
    setLoading(true);
    try {
      const q = new URLSearchParams();
      if (f.locality)   q.append('locality',   f.locality);
      if (f.bhk)        q.append('bhk',        f.bhk);
      if (f.furnishing) q.append('furnishing', f.furnishing);
      q.append('sort_by', f.sort_by);
      q.append('order',   f.order);
      q.append('offset',  f.offset);
      q.append('limit',   f.limit);
      const res = await apiFetch(`/api/rentals?${q}`);
      if (res && res.ok) setData(await res.json());
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchRentals(filter); }, []);

  const applyFilter = (updates) => {
    const next = { ...filter, ...updates, offset: 0 };
    setFilter(next);
    fetchRentals(next);
  };

  const onSortChange = (val) => {
    const [sort_by, order] = val.split(':');
    applyFilter({ sort_by, order });
  };

  const reset = () => {
    const next = { ...DEFAULT_FILTER };
    setFilter(next);
    fetchRentals(next);
  };

  const activeFilters = [filter.locality, filter.bhk, filter.furnishing].filter(Boolean).length;

  return (
    <>
      <div className="hero-section">
        <div className="hero-eyebrow">🔑 Rental Listings</div>
        <h1 className="hero-title">Rental Homes in Bangalore</h1>
        <p className="hero-subtitle">Monthly rentals with verified deposit amounts, maintenance transparency, and authentic landlord details.</p>
      </div>

      <div className="glass-card filter-bar">
        <div className="filter-group">
          <label className="filter-label">📍 Locality</label>
          <select id="r-filter-locality" value={filter.locality} onChange={e => applyFilter({ locality: e.target.value })}>
            {LOCALITIES.map(l => <option key={l.value} value={l.value}>{l.label}</option>)}
          </select>
        </div>
        <div className="filter-group">
          <label className="filter-label">🛏 Bedrooms</label>
          <select id="r-filter-bhk" value={filter.bhk} onChange={e => applyFilter({ bhk: e.target.value })}>
            <option value="">Any BHK</option>
            {[1,2,3,4].map(n => <option key={n} value={n}>{n} BHK</option>)}
          </select>
        </div>
        <div className="filter-group">
          <label className="filter-label">🛋 Furnishing</label>
          <select id="r-filter-furnishing" value={filter.furnishing} onChange={e => applyFilter({ furnishing: e.target.value })}>
            <option value="">Any</option>
            <option value="unfurnished">Unfurnished</option>
            <option value="semi-furnished">Semi-Furnished</option>
            <option value="fully-furnished">Fully Furnished</option>
          </select>
        </div>
        <div className="filter-group">
          <label className="filter-label">↕ Sort</label>
          <select id="r-filter-sort" value={`${filter.sort_by}:${filter.order}`} onChange={e => onSortChange(e.target.value)}>
            <option value="price:asc">Rent: Low → High</option>
            <option value="price:desc">Rent: High → Low</option>
            <option value="carpet_area:desc">Largest Area</option>
            <option value="posted_at:desc">Latest First</option>
          </select>
        </div>
        <div className="filter-group" style={{ flex: 0, minWidth: 'auto' }}>
          <label className="filter-label" style={{ visibility: 'hidden' }}>Reset</label>
          <button
            id="r-reset-btn"
            className="btn btn-ghost btn-sm"
            onClick={reset}
            style={{ border: '1px solid var(--border-color)', whiteSpace: 'nowrap', color: activeFilters ? 'var(--indigo)' : '', borderColor: activeFilters ? 'rgba(129,140,248,0.4)' : '' }}
          >
            ✕ Reset {activeFilters > 0 && <span style={{ background: 'var(--indigo)', color: '#fff', borderRadius: 99, padding: '1px 6px', fontSize: '0.7rem', fontWeight: 800, marginLeft: 4 }}>{activeFilters}</span>}
          </button>
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
        <span id="rentals-count-label" style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
          {data
            ? <>Showing <strong style={{ color: 'var(--text-primary)' }}>{data.results.length}</strong> of <strong style={{ color: 'var(--indigo)' }}>{data.total.toLocaleString()}</strong> rental properties</>
            : 'Loading rentals…'}
        </span>
        <span className="chip indigo">🔑 Monthly Rent</span>
      </div>

      <div id="rentals-grid" className="property-grid">
        {loading ? <SkeletonCards count={12} /> :
          !data?.results?.length ? (
            <div className="empty-state">
              <div className="empty-state-icon">🏠</div>
              <div className="empty-state-title">No rentals match your filters.</div>
              <button className="btn btn-secondary" style={{ marginTop: 16 }} onClick={reset}>Clear Filters</button>
            </div>
          ) : data.results.map(r => {
            const locColor = LOCALITY_COLORS[(r.locality || '').toLowerCase()] || 'var(--indigo)';
            return (
              <div key={r.listing_id || r.id || Math.random()} className="glass-card property-card fade-in">
                <div className="card-image-wrap">
                  <div className="card-image-bg" style={{ background: 'linear-gradient(135deg,#0a1832 0%,#111f40 60%,#0a1832 100%)' }}>
                    <span style={{ fontSize: '3.5rem' }}>🏡</span>
                  </div>
                  <div className="card-accent-line" style={{ background: 'linear-gradient(90deg,var(--indigo),var(--violet))' }} />
                  <div className="badge-strip">
                    <span className="badge badge-rent">For Rent</span>
                    <span className="badge badge-source">{(r.website || 'Portal').toUpperCase()}</span>
                  </div>
                </div>
                <div className="card-body">
                  <div className="card-price" style={{ color: 'var(--indigo)' }}>
                    ₹{r.price.toLocaleString('en-IN')}<span className="card-price-per-sqft">/month</span>
                  </div>
                  <h3 className="card-title">{r.title || r.apartment_name || 'Rental Property'}</h3>
                  <div className="card-location">
                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: locColor, flexShrink: 0, display: 'inline-block' }} />
                    {(r.locality || 'Bangalore').toUpperCase()}
                  </div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                    <span>Deposit: <strong style={{ color: 'var(--text-secondary)' }}>₹{(r.deposit||0).toLocaleString('en-IN')}</strong></span>
                    <span>Maint: <strong style={{ color: 'var(--text-secondary)' }}>₹{(r.maintenance||0).toLocaleString('en-IN')}</strong></span>
                  </div>
                  <div className="card-specs">
                    <span className="spec-item">🛏 {r.bedroom} BHK</span>
                    <span className="spec-item">📐 {r.carpet_area} sqft</span>
                    <span className="spec-item">🛋 {r.furnishing}</span>
                  </div>
                </div>
              </div>
            );
          })
        }
      </div>

      {data && (
        <Pagination
          total={data.total}
          offset={filter.offset}
          limit={filter.limit}
          onPageChange={(newOffset) => {
            const next = { ...filter, offset: newOffset };
            setFilter(next);
            fetchRentals(next);
            window.scrollTo({ top: 280, behavior: 'smooth' });
          }}
        />
      )}
    </>
  );
}
