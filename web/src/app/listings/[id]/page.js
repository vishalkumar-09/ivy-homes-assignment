'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { apiFetch } from '@/lib/apiFetch';
import { PROPERTY_THEMES, LOCALITY_COLORS, fmtINR } from '@/lib/constants';
import { PropertyCard } from '@/components/Cards';
import { useSaved } from '@/contexts/SavedContext';
import { useAuth } from '@/contexts/AuthContext';

export default function ListingDetailPage() {
  const { id }   = useParams();
  const router   = useRouter();
  const { savedIds, toggleSave } = useSaved();
  const { setLoginOpen } = useAuth();
  const [data, setData]   = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const res = await apiFetch(`/api/listings/${id}`);
      if (!res || !res.ok) { if (!cancelled) setError(true); }
      else { const d = await res.json(); if (!cancelled) setData(d); }
      if (!cancelled) setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [id]);

  if (loading) return (
    <div style={{ padding: 80, textAlign: 'center' }}>
      <div className="skeleton" style={{ height: 28, width: 200, margin: '0 auto 16px' }} />
      <div className="skeleton" style={{ height: 400, borderRadius: 'var(--r-lg)' }} />
    </div>
  );

  if (error || !data) return (
    <div className="empty-state" style={{ padding: '100px 20px' }}>
      <div className="empty-state-icon">🏚️</div>
      <div className="empty-state-title">Listing not found</div>
      <button className="btn btn-secondary" style={{ marginTop: 16 }} onClick={() => router.push('/')}>← Back to Listings</button>
    </div>
  );

  const { listing: l, similar } = data;
  const isSqM   = l.is_unit_sqm;
  const pt      = (l.property_type || 'apartment').toLowerCase();
  const theme   = PROPERTY_THEMES[pt] || PROPERTY_THEMES.apartment;
  const area    = isSqM ? `${l.carpet_area_sqft} sqft (${l.carpet_area} m²)` : `${l.carpet_area_sqft || l.carpet_area} sqft`;
  const isSaved = savedIds.has(l.listing_id);
  const locColor = LOCALITY_COLORS[(l.locality || '').toLowerCase()] || 'var(--accent)';

  return (
    <>
      <div style={{ marginBottom: 22, display: 'flex', alignItems: 'center', gap: 12 }}>
        <button className="btn btn-secondary btn-sm" onClick={() => router.push('/')}>← Back</button>
        <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
          Properties / {l.locality || 'Bangalore'} / {l.listing_id}
        </span>
      </div>

      <div className="glass-card fade-in" style={{ overflow: 'hidden', marginBottom: 28 }}>
        {/* Hero banner */}
        <div style={{ height: 240, background: theme.gradient, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '5rem', position: 'relative' }}>
          <span style={{ filter: 'drop-shadow(0 8px 24px rgba(0,0,0,0.5))' }}>{theme.icon}</span>
          <div style={{ position: 'absolute', top: 16, left: 16, display: 'flex', gap: 8 }}>
            {l.is_verified && <span className="badge badge-verified">✓ Verified</span>}
            <span className="badge badge-source">{(l.website || 'Portal').toUpperCase()}</span>
            {isSqM && <span className="badge badge-sqm">📐 SqM Converted</span>}
          </div>
          <div style={{ position: 'absolute', top: 16, right: 16 }}>
            <span className={`chip ${l.is_live ? 'green' : 'red'}`}>{l.is_live ? '● Live' : '○ Inactive'}</span>
          </div>
          <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 80, background: 'linear-gradient(to bottom,transparent,rgba(9,13,24,0.95))' }} />
        </div>

        {/* Main info */}
        <div style={{ padding: 28 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 20, marginBottom: 24 }}>
            <div>
              <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '1.9rem', fontWeight: 800, letterSpacing: '-0.03em', marginBottom: 8 }}>
                {l.apartment_name || 'Premium Residence'}
              </h1>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text-secondary)', fontSize: '1rem' }}>
                <span style={{ width: 10, height: 10, borderRadius: '50%', background: locColor, flexShrink: 0 }} />
                <strong style={{ color: 'var(--text-primary)' }}>{(l.locality || 'Bangalore').toUpperCase()}</strong>
                {l.floor && <> · Floor <strong>{l.floor}</strong> of <strong>{l.total_floors}</strong></>}
                &nbsp;· {(l.property_type || 'Property').replace(/\b\w/g, c => c.toUpperCase())}
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: '2.2rem', fontWeight: 900, color: 'var(--accent)', letterSpacing: '-0.04em', lineHeight: 1 }}>
                {l.price_formatted || fmtINR(l.price)}
              </div>
              <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem', margin: '4px 0' }}>₹{(l.price_per_sqft||0).toLocaleString('en-IN')} / sqft</div>
              <button
                id="detail-save-btn"
                className={`btn ${isSaved ? 'btn-danger' : 'btn-primary'}`}
                style={{ marginTop: 10 }}
                onClick={() => toggleSave(l.listing_id, () => setLoginOpen(true))}
              >
                {isSaved ? '❤️\u00a0Saved' : '🤍\u00a0Save Property'}
              </button>
            </div>
          </div>

          {/* Spec grid */}
          <div className="detail-spec-grid" style={{ marginBottom: 24 }}>
            {[
              { label: 'Bedrooms',    value: `🛏 ${l.bedroom || 0} BHK` },
              { label: 'Bathrooms',   value: `🚿 ${l.bathroom || 0} Bath` },
              { label: 'Carpet Area', value: `📐 ${area}` },
              { label: 'Super Built-up', value: `${l.super_built_up_area || '—'} sqft` },
              { label: 'Facing',      value: `🧭 ${l.facing_direction || '—'}` },
              { label: 'Furnishing',  value: `🛋 ${l.furnishing || '—'}` },
              { label: 'Listing ID',  value: l.listing_id },
              { label: 'Posted',      value: l.posted_at ? l.posted_at.split('T')[0] : '—' },
            ].map(({ label, value }) => (
              <div key={label} className="detail-spec-box">
                <span className="detail-spec-label">{label}</span>
                <span className="detail-spec-value" style={{ fontFamily: label === 'Listing ID' ? 'monospace' : undefined, fontSize: label === 'Listing ID' ? '0.82rem' : undefined }}>{value}</span>
              </div>
            ))}
          </div>

          {/* Description */}
          {l.description && (
            <div style={{ marginBottom: 24 }}>
              <div className="section-heading">Description</div>
              <p style={{ color: 'var(--text-secondary)', lineHeight: 1.8, fontSize: '0.95rem' }}>{l.description}</p>
            </div>
          )}

          {/* Agent */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, padding: 16, background: 'rgba(0,0,0,0.25)', borderRadius: 'var(--r-sm)', border: '1px solid var(--border-color)' }}>
            <div style={{ width: 44, height: 44, borderRadius: '50%', background: 'linear-gradient(135deg,var(--accent),var(--indigo))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem', flexShrink: 0 }}>👤</div>
            <div>
              <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{l.posted_by_name || 'Agent'}</div>
              <div style={{ fontSize: '0.83rem', color: 'var(--text-muted)' }}>{l.posted_by_contact || 'Contact via portal'} · {l.posted_by || 'Portal'}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Similar Properties */}
      <div style={{ marginTop: 36 }}>
        <div className="section-heading" style={{ fontSize: '1.1rem' }}>
          Comparable Properties in {(l.locality || 'Locality').toUpperCase()} (±15% price)
        </div>
        {similar?.length > 0
          ? <div className="property-grid">{similar.map(s => <PropertyCard key={s.listing_id} listing={s} />)}</div>
          : (
            <div className="empty-state" style={{ padding: 40 }}>
              <div className="empty-state-icon" style={{ fontSize: '2rem' }}>🏘️</div>
              <div className="empty-state-title">No exact comparables available right now.</div>
            </div>
          )
        }
      </div>
    </>
  );
}
