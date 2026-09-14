'use client';

import { PROPERTY_THEMES, LOCALITY_COLORS, formatListingClient, fmtINR } from '@/lib/constants';
import { useSaved } from '@/contexts/SavedContext';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';

export function SkeletonCard() {
  return (
    <div className="skeleton-card glass-card">
      <div className="skeleton" style={{ height: 200, borderRadius: 0 }} />
      <div style={{ padding: 18, display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div className="skeleton" style={{ height: 22, width: '55%' }} />
        <div className="skeleton" style={{ height: 16, width: '80%' }} />
        <div className="skeleton" style={{ height: 14, width: '45%' }} />
        <div className="skeleton" style={{ height: 1, margin: '4px 0' }} />
        <div style={{ display: 'flex', gap: 8 }}>
          <div className="skeleton" style={{ height: 24, width: 60, borderRadius: 4 }} />
          <div className="skeleton" style={{ height: 24, width: 60, borderRadius: 4 }} />
          <div className="skeleton" style={{ height: 24, width: 80, borderRadius: 4 }} />
        </div>
      </div>
    </div>
  );
}

export function SkeletonCards({ count = 12 }) {
  return Array.from({ length: count }, (_, i) => <SkeletonCard key={i} />);
}

export function PropertyCard({ listing: rawListing }) {
  const l        = formatListingClient(rawListing);
  const router   = useRouter();
  const { savedIds, toggleSave } = useSaved();
  const { setLoginOpen }         = useAuth();

  const isSaved  = savedIds.has(l.listing_id);
  const isSqM    = l.is_unit_sqm;
  const pt       = (l.property_type || 'apartment').toLowerCase();
  const theme    = PROPERTY_THEMES[pt] || PROPERTY_THEMES.apartment;
  const locColor = LOCALITY_COLORS[(l.locality || '').toLowerCase()] || 'var(--accent)';
  const area     = isSqM
    ? <>{l.carpet_area_sqft} sqft <small style={{ opacity: 0.6 }}>({l.carpet_area}m²)</small></>
    : `${l.carpet_area_sqft || l.carpet_area} sqft`;
  const price    = l.price_formatted || fmtINR(l.price);

  const handleFav = (e) => {
    e.stopPropagation();
    e.preventDefault();
    toggleSave(l.listing_id, () => setLoginOpen(true));
  };

  return (
    <div
      className="glass-card property-card fade-in"
      onClick={() => router.push(`/listings/${l.listing_id}`)}
    >
      <div className="card-image-wrap">
        <div className="card-image-bg" style={{ background: theme.gradient }}>
          <span style={{ fontSize: '3.5rem', filter: 'drop-shadow(0 4px 12px rgba(0,0,0,0.5))' }}>{theme.icon}</span>
        </div>
        <div className="card-accent-line" />
        <div className="badge-strip">
          {l.is_verified && <span className="badge badge-verified">✓ Verified</span>}
          <span className="badge badge-source">{(l.website || 'Portal').toUpperCase()}</span>
          {isSqM && <span className="badge badge-sqm">SqM→SqFt</span>}
        </div>
        <button
          className={`favourite-btn${isSaved ? ' saved' : ''}`}
          data-id={l.listing_id}
          onClick={handleFav}
          aria-label={isSaved ? 'Remove from saved' : 'Save property'}
        >
          {isSaved ? '❤️' : '🤍'}
        </button>
      </div>
      <div className="card-body">
        <div className="card-price">
          {price}
          {l.price_per_sqft ? <span className="card-price-per-sqft">₹{l.price_per_sqft.toLocaleString('en-IN')}/sqft</span> : null}
        </div>
        <h3 className="card-title">{l.apartment_name || 'Premium Residence'}</h3>
        <div className="card-location">
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: locColor, flexShrink: 0, display: 'inline-block' }} />
          {(l.locality || 'Bangalore').toUpperCase()}
          {l.floor ? <span style={{ marginLeft: 'auto', fontSize: '0.75rem', opacity: 0.6 }}>Floor {l.floor}/{l.total_floors}</span> : null}
        </div>
        <div className="card-specs">
          <span className="spec-item">🛏 {l.bedroom || 0} BHK</span>
          <span className="spec-item">🚿 {l.bathroom || 0} Bath</span>
          <span className="spec-item">📐 {area}</span>
        </div>
      </div>
    </div>
  );
}
