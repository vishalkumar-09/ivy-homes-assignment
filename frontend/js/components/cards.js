// ═══════════════════════════════════════════════════════
//  Ivy Homes — Card UI Components
// ═══════════════════════════════════════════════════════

function skeletonCards(n = 12) {
  return Array(n).fill('').map(() => `
    <div class="skeleton-card glass-card">
      <div class="skeleton" style="height:200px;border-radius:0;"></div>
      <div style="padding:18px;display:flex;flex-direction:column;gap:10px;">
        <div class="skeleton" style="height:22px;width:55%;"></div>
        <div class="skeleton" style="height:16px;width:80%;"></div>
        <div class="skeleton" style="height:14px;width:45%;"></div>
        <div class="skeleton" style="height:1px;margin:4px 0;"></div>
        <div style="display:flex;gap:8px;">
          <div class="skeleton" style="height:24px;width:60px;border-radius:4px;"></div>
          <div class="skeleton" style="height:24px;width:60px;border-radius:4px;"></div>
          <div class="skeleton" style="height:24px;width:80px;border-radius:4px;"></div>
        </div>
      </div>
    </div>`).join('');
}

function createListingCard(rawL) {
  const l      = formatListingClient(rawL);
  const isSqM  = l.is_unit_sqm;
  const pt     = (l.property_type || 'apartment').toLowerCase();
  const theme  = PROPERTY_THEMES[pt] || PROPERTY_THEMES.apartment;
  const area   = isSqM ? `${l.carpet_area_sqft} sqft <small style="opacity:.6">(${l.carpet_area}m²)</small>` : `${l.carpet_area_sqft || l.carpet_area} sqft`;
  const price  = l.price_formatted || fmtINR(l.price);
  const ppsq   = l.price_per_sqft  ? `<span class="card-price-per-sqft">₹${l.price_per_sqft.toLocaleString('en-IN')}/sqft</span>` : '';
  const isSaved = state.savedListingIds.has(l.listing_id);
  const locColor = LOCALITY_COLORS[(l.locality || '').toLowerCase()] || 'var(--accent)';

  return `
    <div class="glass-card property-card fade-in" onclick="navigate('listing-detail','${l.listing_id}')">
      <div class="card-image-wrap">
        <div class="card-image-bg" style="background:${theme.gradient}">
          <span style="font-size:3.5rem;filter:drop-shadow(0 4px 12px rgba(0,0,0,0.5));">${theme.icon}</span>
        </div>
        <div class="card-accent-line"></div>
        <div class="badge-strip">
          ${l.is_verified ? `<span class="badge badge-verified">✓ Verified</span>` : ''}
          <span class="badge badge-source">${(l.website || 'Portal').toUpperCase()}</span>
          ${isSqM ? `<span class="badge badge-sqm">SqM→SqFt</span>` : ''}
        </div>
        <button class="favourite-btn ${isSaved ? 'saved' : ''}" data-id="${l.listing_id}" onclick="toggleSave('${l.listing_id}',event)">${isSaved ? '❤️' : '🤍'}</button>
      </div>
      <div class="card-body">
        <div class="card-price">${price}${ppsq}</div>
        <h3 class="card-title">${l.apartment_name || 'Premium Residence'}</h3>
        <div class="card-location">
          <span style="width:8px;height:8px;border-radius:50%;background:${locColor};flex-shrink:0;display:inline-block;"></span>
          ${(l.locality || 'Bangalore').toUpperCase()}
          ${l.floor ? `<span style="margin-left:auto;font-size:0.75rem;opacity:.6;">Floor ${l.floor}/${l.total_floors}</span>` : ''}
        </div>
        <div class="card-specs">
          <span class="spec-item">🛏 ${l.bedroom || 0} BHK</span>
          <span class="spec-item">🚿 ${l.bathroom || 0} Bath</span>
          <span class="spec-item">📐 ${area}</span>
        </div>
      </div>
    </div>`;
}
