'use client';

import { useState, useCallback, useEffect } from 'react';
import { apiFetch } from '@/lib/apiFetch';
import { LOCALITIES, LOCALITY_COLORS, PROJ_GRADIENTS } from '@/lib/constants';
import { SkeletonCards } from '@/components/Cards';
import Pagination from '@/components/Pagination';

const DEFAULT_FILTER = {
  locality: '', project_status: '',
  sort_by: 'price_max', order: 'desc', offset: 0, limit: 12,
};

export default function ProjectsPage() {
  const [filter, setFilter]   = useState(DEFAULT_FILTER);
  const [data, setData]       = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchProjects = useCallback(async (f) => {
    setLoading(true);
    try {
      const q = new URLSearchParams();
      if (f.locality)       q.append('locality',       f.locality);
      if (f.project_status) q.append('project_status', f.project_status);
      q.append('sort_by', f.sort_by);
      q.append('order',   f.order);
      q.append('offset',  f.offset);
      q.append('limit',   f.limit);
      const res = await apiFetch(`/api/projects?${q}`);
      if (res && res.ok) setData(await res.json());
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchProjects(filter); }, []);

  const applyFilter = (updates) => {
    const next = { ...filter, ...updates, offset: 0 };
    setFilter(next);
    fetchProjects(next);
  };

  const onSortChange = (val) => {
    const [sort_by, order] = val.split(':');
    applyFilter({ sort_by, order });
  };

  const reset = () => {
    const next = { ...DEFAULT_FILTER };
    setFilter(next);
    fetchProjects(next);
  };

  const activeFilters = [filter.locality, filter.project_status].filter(Boolean).length;

  return (
    <>
      <div className="hero-section">
        <div className="hero-eyebrow">🏗️ Builder Projects</div>
        <h1 className="hero-title">Residential Developments</h1>
        <p className="hero-subtitle">Top builder projects in Bangalore with corrected Crore pricing, RERA registration, and verified listing counts.</p>
      </div>

      <div className="glass-card filter-bar">
        <div className="filter-group">
          <label className="filter-label">📍 Locality</label>
          <select id="p-filter-locality" value={filter.locality} onChange={e => applyFilter({ locality: e.target.value })}>
            {LOCALITIES.map(l => <option key={l.value} value={l.value}>{l.label}</option>)}
          </select>
        </div>
        <div className="filter-group">
          <label className="filter-label">🏗 Status</label>
          <select id="p-filter-status" value={filter.project_status} onChange={e => applyFilter({ project_status: e.target.value })}>
            <option value="">All Statuses</option>
            <option value="under construction">Under Construction</option>
            <option value="completed">Completed</option>
            <option value="pre-launch">Pre-Launch</option>
          </select>
        </div>
        <div className="filter-group">
          <label className="filter-label">↕ Sort</label>
          <select id="p-filter-sort" value={`${filter.sort_by}:${filter.order}`} onChange={e => onSortChange(e.target.value)}>
            <option value="price_max:desc">Price: High → Low</option>
            <option value="price_max:asc">Price: Low → High</option>
            <option value="total_units:desc">Most Units</option>
            <option value="launch_date:desc">Newest Launch</option>
          </select>
        </div>
        <div className="filter-group" style={{ flex: 0, minWidth: 'auto' }}>
          <label className="filter-label" style={{ visibility: 'hidden' }}>Reset</label>
          <button
            id="p-reset-btn"
            className="btn btn-ghost btn-sm"
            onClick={reset}
            style={{ border: '1px solid var(--border-color)', whiteSpace: 'nowrap', color: activeFilters ? 'var(--violet)' : '', borderColor: activeFilters ? 'rgba(167,139,250,0.4)' : '' }}
          >
            ✕ Reset {activeFilters > 0 && <span style={{ background: 'var(--violet)', color: '#fff', borderRadius: 99, padding: '1px 6px', fontSize: '0.7rem', fontWeight: 800, marginLeft: 4 }}>{activeFilters}</span>}
          </button>
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
        <span id="projects-count-label" style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
          {data
            ? <>Showing <strong style={{ color: 'var(--text-primary)' }}>{data.results.length}</strong> of <strong style={{ color: 'var(--violet)' }}>{data.total.toLocaleString()}</strong> builder projects</>
            : 'Loading projects…'}
        </span>
        <div style={{ display: 'flex', gap: 8 }}>
          <span className="chip" style={{ background: 'var(--violet-dim)', color: 'var(--violet)', borderColor: 'rgba(167,139,250,0.2)' }}>💡 Prices in Crores (corrected)</span>
          <span className="chip yellow">⚠️ Count mismatch = wrong in API</span>
        </div>
      </div>

      <div id="projects-grid" className="property-grid">
        {loading ? <SkeletonCards count={12} /> :
          !data?.results?.length ? (
            <div className="empty-state">
              <div className="empty-state-icon">🏗️</div>
              <div className="empty-state-title">No projects match your filters.</div>
              <button className="btn btn-secondary" style={{ marginTop: 16 }} onClick={reset}>Clear Filters</button>
            </div>
          ) : data.results.map((p, i) => {
            const statusColor = p.project_status === 'completed'          ? 'var(--success)' :
                                p.project_status === 'under construction' ? 'var(--warning)' : 'var(--indigo)';
            const countMatch  = p.actual_total_listings === p.total_listings;
            const locColor    = LOCALITY_COLORS[(p.locality || '').toLowerCase()] || 'var(--violet)';
            return (
              <div key={p.project_id || i} className="glass-card project-card fade-in">
                <div className="project-hero" style={{ background: PROJ_GRADIENTS[i % 4] }}>
                  <span style={{ fontSize: '3rem', filter: 'drop-shadow(0 4px 16px rgba(0,0,0,0.5))' }}>🏗️</span>
                  <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 50, background: 'linear-gradient(to bottom,transparent,rgba(9,13,24,0.9))' }} />
                  <div className="project-status-badge" style={{ color: statusColor, background: 'rgba(0,0,0,0.35)', borderColor: `${statusColor}40` }}>
                    {(p.project_status || 'Active').toUpperCase()}
                  </div>
                </div>
                <div className="card-body">
                  <div className="card-price" style={{ color: 'var(--violet)' }}>{p.price_range_formatted || '—'}</div>
                  <h3 className="card-title">{p.apartment_name || 'Builder Project'}</h3>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: 2 }}>
                    by <strong style={{ color: 'var(--text-secondary)' }}>{p.developer_name || '—'}</strong>
                  </div>
                  <div className="card-location">
                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: locColor, display: 'inline-block', flexShrink: 0 }} />
                    {(p.locality || 'Bangalore').toUpperCase()}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontFamily: 'monospace', margin: '2px 0' }}>RERA: {p.rera_number || 'Registered'}</div>
                  <div className="card-specs">
                    <span className="spec-item">🏢 {p.total_units || 0} Units</span>
                    <span className="spec-item">🗼 {p.total_towers || 0} Towers</span>
                    <span className={`spec-item${countMatch ? '' : ' text-warning'}`} title={countMatch ? 'Count verified' : '⚠️ count disagrees with API'}>
                      {countMatch ? '✓' : '⚠️'} {p.actual_total_listings} listings
                    </span>
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
            fetchProjects(next);
            window.scrollTo({ top: 280, behavior: 'smooth' });
          }}
        />
      )}
    </>
  );
}
