// ═══════════════════════════════════════════════════════
//  Ivy Homes — Listing Detail View Module
// ═══════════════════════════════════════════════════════

async function loadListingDetailView(listingId) {
  const container = document.getElementById('view-container');
  container.innerHTML = `
    <div style="padding:80px;text-align:center;">
      <div class="skeleton" style="height:28px;width:200px;margin:0 auto 16px;"></div>
      <div class="skeleton" style="height:400px;border-radius:var(--r-lg);"></div>
    </div>`;

  try {
    const res = await apiFetch(`/api/listings/${listingId}`);
    if (!res || !res.ok) {
      container.innerHTML = `<div class="empty-state" style="padding:100px 20px;"><div class="empty-state-icon">🏚️</div><div class="empty-state-title">Listing not found</div><button class="btn btn-secondary" style="margin-top:16px;" onclick="navigate('listings')">← Back to Listings</button></div>`;
      return;
    }
    const data    = await res.json();
    const l       = data.listing;
    const similar = data.similar || [];
    const isSqM   = l.is_unit_sqm;
    const pt      = (l.property_type || 'apartment').toLowerCase();
    const theme   = PROPERTY_THEMES[pt] || PROPERTY_THEMES.apartment;
    const area    = isSqM ? `${l.carpet_area_sqft} sqft (${l.carpet_area} m²)` : `${l.carpet_area_sqft || l.carpet_area} sqft`;
    const isSaved = state.savedListingIds.has(l.listing_id);
    const locColor = LOCALITY_COLORS[(l.locality || '').toLowerCase()] || 'var(--accent)';

    container.innerHTML = `
      <div style="margin-bottom:22px;display:flex;align-items:center;gap:12px;">
        <button class="btn btn-secondary btn-sm" onclick="navigate('listings')">← Back</button>
        <span style="color:var(--text-muted);font-size:0.85rem;">Properties / ${l.locality || 'Bangalore'} / ${l.listing_id}</span>
      </div>

      <div class="glass-card fade-in" style="overflow:hidden;margin-bottom:28px;">
        <!-- Hero banner -->
        <div style="height:240px;background:${theme.gradient};display:flex;align-items:center;justify-content:center;font-size:5rem;position:relative;">
          <span style="filter:drop-shadow(0 8px 24px rgba(0,0,0,0.5));">${theme.icon}</span>
          <div style="position:absolute;top:16px;left:16px;display:flex;gap:8px;">
            ${l.is_verified ? `<span class="badge badge-verified">✓ Verified</span>` : ''}
            <span class="badge badge-source">${(l.website || 'Portal').toUpperCase()}</span>
            ${isSqM ? `<span class="badge badge-sqm">📐 SqM Converted</span>` : ''}
          </div>
          <div style="position:absolute;top:16px;right:16px;">
            <span class="chip ${l.is_live ? 'green' : 'red'}">${l.is_live ? '● Live' : '○ Inactive'}</span>
          </div>
          <div style="position:absolute;bottom:0;left:0;right:0;height:80px;background:linear-gradient(to bottom,transparent,rgba(9,13,24,0.95));"></div>
        </div>

        <!-- Main info -->
        <div style="padding:28px;">
          <div style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:20px;margin-bottom:24px;">
            <div>
              <h1 style="font-family:var(--font-display);font-size:1.9rem;font-weight:800;letter-spacing:-0.03em;margin-bottom:8px;">${l.apartment_name || 'Premium Residence'}</h1>
              <div style="display:flex;align-items:center;gap:8px;color:var(--text-secondary);font-size:1rem;">
                <span style="width:10px;height:10px;border-radius:50%;background:${locColor};flex-shrink:0;"></span>
                <strong style="color:var(--text-primary);">${(l.locality || 'Bangalore').toUpperCase()}</strong>
                ${l.floor ? `· Floor <strong>${l.floor}</strong> of <strong>${l.total_floors}</strong>` : ''}
                · ${(l.property_type || 'Property').replace(/\b\w/g,c=>c.toUpperCase())}
              </div>
            </div>
            <div style="text-align:right;">
              <div style="font-family:var(--font-display);font-size:2.2rem;font-weight:900;color:var(--accent);letter-spacing:-0.04em;line-height:1;">${l.price_formatted || fmtINR(l.price)}</div>
              <div style="color:var(--text-muted);font-size:0.9rem;margin:4px 0;">₹${(l.price_per_sqft||0).toLocaleString('en-IN')} / sqft</div>
              <button id="detail-save-btn" class="btn ${isSaved ? 'btn-danger' : 'btn-primary'}" style="margin-top:10px;" onclick="toggleSave('${l.listing_id}',event)">
                ${isSaved ? '❤️&nbsp; Saved' : '🤍&nbsp; Save Property'}
              </button>
            </div>
          </div>

          <!-- Spec grid -->
          <div class="detail-spec-grid" style="margin-bottom:24px;">
            <div class="detail-spec-box"><span class="detail-spec-label">Bedrooms</span><span class="detail-spec-value">🛏 ${l.bedroom || 0} BHK</span></div>
            <div class="detail-spec-box"><span class="detail-spec-label">Bathrooms</span><span class="detail-spec-value">🚿 ${l.bathroom || 0} Bath</span></div>
            <div class="detail-spec-box"><span class="detail-spec-label">Carpet Area</span><span class="detail-spec-value">📐 ${area}</span></div>
            <div class="detail-spec-box"><span class="detail-spec-label">Super Built-up</span><span class="detail-spec-value">${l.super_built_up_area || '—'} sqft</span></div>
            <div class="detail-spec-box"><span class="detail-spec-label">Facing</span><span class="detail-spec-value">🧭 ${l.facing_direction || '—'}</span></div>
            <div class="detail-spec-box"><span class="detail-spec-label">Furnishing</span><span class="detail-spec-value">🛋 ${l.furnishing || '—'}</span></div>
            <div class="detail-spec-box"><span class="detail-spec-label">Listing ID</span><span class="detail-spec-value" style="font-size:0.82rem;font-family:monospace;">${l.listing_id}</span></div>
            <div class="detail-spec-box"><span class="detail-spec-label">Posted</span><span class="detail-spec-value" style="font-size:0.85rem;">${l.posted_at ? l.posted_at.split('T')[0] : '—'}</span></div>
          </div>

          <!-- Description -->
          ${l.description ? `
          <div style="margin-bottom:24px;">
            <div class="section-heading">Description</div>
            <p style="color:var(--text-secondary);line-height:1.8;font-size:0.95rem;">${l.description}</p>
          </div>` : ''}

          <!-- Agent -->
          <div style="display:flex;align-items:center;gap:16px;padding:16px;background:rgba(0,0,0,0.25);border-radius:var(--r-sm);border:1px solid var(--border-color);">
            <div style="width:44px;height:44px;border-radius:50%;background:linear-gradient(135deg,var(--accent),var(--indigo));display:flex;align-items:center;justify-content:center;font-size:1.2rem;flex-shrink:0;">👤</div>
            <div>
              <div style="font-weight:600;color:var(--text-primary);">${l.posted_by_name || 'Agent'}</div>
              <div style="font-size:0.83rem;color:var(--text-muted);">${l.posted_by_contact || 'Contact via portal'} · ${l.posted_by || 'Portal'}</div>
            </div>
          </div>
        </div>
      </div>

      <!-- Similar Properties -->
      <div style="margin-top:36px;">
        <div class="section-heading" style="font-size:1.1rem;">Comparable Properties in ${(l.locality||'Locality').toUpperCase()} (±15% price)</div>
        ${similar.length > 0
          ? `<div class="property-grid">${similar.map(s => createListingCard(s)).join('')}</div>`
          : `<div class="empty-state" style="padding:40px;"><div class="empty-state-icon" style="font-size:2rem;">🏘️</div><div class="empty-state-title">No exact comparables available right now.</div></div>`}
      </div>`;

    renderFavouriteButtons();
  } catch (e) { console.error('loadListingDetail:', e); }
}
