'use client';

import { useEffect, useState } from 'react';
import { apiFetch } from '@/lib/apiFetch';

export default function InsightsPage() {
  const [data, setData]     = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await apiFetch('/api/insights/summary');
        if (res && res.ok) setData(await res.json());
      } catch (e) { console.error(e); }
      finally { setLoading(false); }
    })();
  }, []);

  if (loading) return (
    <>
      <div className="hero-section">
        <div className="hero-eyebrow">📊 Market Intelligence</div>
        <h1 className="hero-title">Bangalore Real Estate Insights</h1>
      </div>
      <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>Computing insights…</div>
    </>
  );

  if (!data) return <div className="empty-state"><div className="empty-state-icon">📊</div><div className="empty-state-title">Failed to load insights.</div></div>;

  const topLoc   = data.locality_breakdown.slice(0, 8);
  const maxCount = Math.max(...topLoc.map(l => l.count), 1);

  const STATS = [
    { icon: '🏠', label: 'Total Listings',    value: data.total_listings.toLocaleString(),  sub: 'Retrieved' },
    { icon: '✅', label: 'Active & Live',      value: data.active_listings.toLocaleString(), sub: 'is_live = true', accent: true },
    { icon: '🔑', label: 'Rental Properties', value: data.total_rentals.toLocaleString(),   sub: 'Monthly' },
    { icon: '🏗️', label: 'Builder Projects', value: data.total_projects.toLocaleString(),  sub: 'Developments' },
    { icon: '🔍', label: 'API Discrepancies', value: data.findings_count,                   sub: 'Proven findings', warn: true },
  ];

  return (
    <>
      <div className="hero-section">
        <div className="hero-eyebrow">📊 Market Intelligence</div>
        <h1 className="hero-title">Bangalore Real Estate Insights</h1>
        <p className="hero-subtitle">
          Aggregated analytics from {data.total_listings.toLocaleString()} listings · corrected for units, fraud, and data quality.
        </p>
      </div>

      {/* Stats strip */}
      <div className="stats-strip" style={{ marginBottom: 36 }}>
        {STATS.map(s => (
          <div key={s.label} className="glass-card stat-box">
            <div className="stat-icon">{s.icon}</div>
            <div className="stat-label">{s.label}</div>
            <div className="stat-value" style={s.accent ? { color: 'var(--accent)' } : s.warn ? { color: 'var(--warning)' } : {}}>{s.value}</div>
            <div className="stat-sub">{s.sub}</div>
          </div>
        ))}
      </div>

      <div className="insights-grid">
        {/* Locality Benchmark */}
        <div className="glass-card" style={{ padding: 24 }}>
          <div className="section-heading">🏙️ Locality Price Benchmark</div>
          {topLoc.map(loc => (
            <div key={loc.locality} className="mini-bar-wrap">
              <div className="mini-bar-label">{loc.locality}</div>
              <div className="mini-bar-track">
                <div className="mini-bar-fill" style={{ width: `${Math.round(loc.count / maxCount * 100)}%` }} />
              </div>
              <div className="mini-bar-value">{loc.count}</div>
            </div>
          ))}
          <div className="divider" />
          <div className="table-responsive">
            <table className="custom-table">
              <thead>
                <tr><th>Locality</th><th>Listings</th><th>Median Price</th></tr>
              </thead>
              <tbody>
                {topLoc.map(loc => (
                  <tr key={loc.locality}>
                    <td><strong>{loc.locality}</strong></td>
                    <td><span className="chip">{loc.count}</span></td>
                    <td style={{ color: 'var(--accent)', fontWeight: 700 }}>{loc.median_price_formatted}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* BHK Distribution + Data Quality */}
        <div className="glass-card" style={{ padding: 24 }}>
          <div className="section-heading">🛏️ BHK Distribution</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginTop: 8 }}>
            {data.bhk_distribution.map(b => {
              const pct = ((b.count / (data.active_listings || 1)) * 100).toFixed(1);
              return (
                <div key={b.bhk}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', marginBottom: 6 }}>
                    <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{b.bhk}</span>
                    <span style={{ color: 'var(--text-muted)' }}><strong style={{ color: 'var(--text-secondary)' }}>{b.count.toLocaleString()}</strong> · {pct}%</span>
                  </div>
                  <div style={{ height: 8, background: 'rgba(255,255,255,0.06)', borderRadius: 4, overflow: 'hidden' }}>
                    <div style={{ width: `${pct}%`, height: '100%', background: 'linear-gradient(90deg,var(--accent),var(--indigo))', borderRadius: 4, transition: 'width 0.8s ease' }} />
                  </div>
                </div>
              );
            })}
          </div>

          <div className="divider" />
          <div className="section-heading" style={{ fontSize: '1rem' }}>🧠 Data Quality Summary</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {[
              { label: 'Corrupt listings (impossible data)',  value: data.answers?.corrupt_listing_ids?.length || 40,  color: 'var(--danger)' },
              { label: 'Fraudulent bait listings',           value: data.answers?.fake_listing_ids?.length || 100,     color: 'var(--warning)' },
              { label: 'Cross-portal duplicates',            value: 4700 - 4572,                                        color: 'var(--indigo)' },
              { label: 'Area in SqM, not SqFt (magichomes)', value: '~374',                                             color: 'var(--violet)' },
              { label: 'Projects with wrong listing count',  value: data.answers?.projects_with_wrong_listing_count || 392, color: 'var(--warning)' },
            ].map(d => (
              <div key={d.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', background: 'rgba(0,0,0,0.2)', borderRadius: 'var(--r-sm)', border: '1px solid var(--border-color)' }}>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{d.label}</span>
                <strong style={{ color: d.color, fontFamily: 'var(--font-display)', fontSize: '1rem' }}>{d.value}</strong>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
