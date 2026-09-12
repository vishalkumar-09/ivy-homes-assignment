// ═══════════════════════════════════════════════════════
//  Ivy Homes — Rentals View Module
// ═══════════════════════════════════════════════════════

async function loadRentalsView() {
  const container = document.getElementById('view-container');
  container.innerHTML = `
    <div class="hero-section">
      <div class="hero-eyebrow">🔑 Rental Listings</div>
      <h1 class="hero-title">Rental Homes in Bangalore</h1>
      <p class="hero-subtitle">Monthly rentals with verified deposit amounts, maintenance transparency, and authentic landlord details.</p>
    </div>

    <div class="glass-card filter-bar">
      <div class="filter-group">
        <label class="filter-label">📍 Locality</label>
        <select id="r-filter-locality" onchange="onRentalsFilterChange()">
          <option value="">All Localities</option>
          <option value="whitefield">Whitefield</option>
          <option value="koramangala">Koramangala</option>
          <option value="indiranagar">Indiranagar</option>
          <option value="hsr layout">HSR Layout</option>
          <option value="bellandur">Bellandur</option>
          <option value="electronic city">Electronic City</option>
          <option value="jp nagar">JP Nagar</option>
          <option value="hebbal">Hebbal</option>
          <option value="yelahanka">Yelahanka</option>
          <option value="sarjapur road">Sarjapur Road</option>
        </select>
      </div>
      <div class="filter-group">
        <label class="filter-label">🛏 Bedrooms</label>
        <select id="r-filter-bhk" onchange="onRentalsFilterChange()">
          <option value="">Any BHK</option>
          <option value="1">1 BHK</option>
          <option value="2">2 BHK</option>
          <option value="3">3 BHK</option>
          <option value="4">4 BHK</option>
        </select>
      </div>
      <div class="filter-group">
        <label class="filter-label">🛋 Furnishing</label>
        <select id="r-filter-furnishing" onchange="onRentalsFilterChange()">
          <option value="">Any</option>
          <option value="unfurnished">Unfurnished</option>
          <option value="semi-furnished">Semi-Furnished</option>
          <option value="fully-furnished">Fully Furnished</option>
        </select>
      </div>
      <div class="filter-group">
        <label class="filter-label">↕ Sort</label>
        <select id="r-filter-sort" onchange="onRentalsSortChange()">
          <option value="price:asc">Rent: Low → High</option>
          <option value="price:desc">Rent: High → Low</option>
          <option value="carpet_area:desc">Largest Area</option>
          <option value="posted_at:desc">Latest First</option>
        </select>
      </div>
      <div class="filter-group" style="flex:0;min-width:auto;">
        <label class="filter-label" style="visibility:hidden;">Reset</label>
        <button class="btn btn-ghost btn-sm" id="r-reset-btn" onclick="resetRentalsFilters()" style="border:1px solid var(--border-color);white-space:nowrap;">✕ Reset</button>
      </div>
    </div>

    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:18px;">
      <span id="rentals-count-label" style="color:var(--text-muted);font-size:0.9rem;">Loading rentals…</span>
      <span class="chip indigo">🔑 Monthly Rent</span>
    </div>

    <div id="rentals-grid" class="property-grid">${skeletonCards(12)}</div>
    <div id="rentals-pagination" class="pagination-controls"></div>`;

  if (state.rentalsFilter.locality)   document.getElementById('r-filter-locality').value   = state.rentalsFilter.locality;
  if (state.rentalsFilter.bhk)        document.getElementById('r-filter-bhk').value         = state.rentalsFilter.bhk;
  if (state.rentalsFilter.furnishing) document.getElementById('r-filter-furnishing').value  = state.rentalsFilter.furnishing;
  updateRentalsResetBtn();

  await fetchAndRenderRentals();
}

async function fetchAndRenderRentals() {
  const f = state.rentalsFilter;
  const q = new URLSearchParams();
  if (f.locality)   q.append('locality',   f.locality);
  if (f.bhk)        q.append('bhk',        f.bhk);
  if (f.furnishing) q.append('furnishing', f.furnishing);
  q.append('sort_by', f.sort_by);
  q.append('order',   f.order);
  q.append('offset',  f.offset);
  q.append('limit',   f.limit);

  try {
    const res  = await apiFetch(`/api/rentals?${q}`);
    if (!res || !res.ok) return;
    const data = await res.json();

    const label = document.getElementById('rentals-count-label');
    if (label) label.innerHTML = `Showing <strong style="color:var(--text-primary)">${data.results.length}</strong> of <strong style="color:var(--indigo)">${data.total.toLocaleString()}</strong> rental properties`;

    const grid = document.getElementById('rentals-grid');
    if (!grid) return;

    if (!data.results.length) {
      grid.innerHTML = `<div class="empty-state"><div class="empty-state-icon">🏠</div><div class="empty-state-title">No rentals match your filters.</div><button class="btn btn-secondary" style="margin-top:16px;" onclick="resetRentalsFilters()">Clear Filters</button></div>`;
      return;
    }

    grid.innerHTML = data.results.map(r => {
      const locColor = LOCALITY_COLORS[(r.locality || '').toLowerCase()] || 'var(--indigo)';
      return `
        <div class="glass-card property-card fade-in">
          <div class="card-image-wrap">
            <div class="card-image-bg" style="background:linear-gradient(135deg,#0a1832 0%,#111f40 60%,#0a1832 100%)">
              <span style="font-size:3.5rem;">🏡</span>
            </div>
            <div class="card-accent-line" style="background:linear-gradient(90deg,var(--indigo),var(--violet));"></div>
            <div class="badge-strip">
              <span class="badge badge-rent">For Rent</span>
              <span class="badge badge-source">${(r.website||'Portal').toUpperCase()}</span>
            </div>
          </div>
          <div class="card-body">
            <div class="card-price" style="color:var(--indigo);">₹${r.price.toLocaleString('en-IN')}<span class="card-price-per-sqft">/month</span></div>
            <h3 class="card-title">${r.title || r.apartment_name || 'Rental Property'}</h3>
            <div class="card-location">
              <span style="width:8px;height:8px;border-radius:50%;background:${locColor};flex-shrink:0;display:inline-block;"></span>
              ${(r.locality || 'Bangalore').toUpperCase()}
            </div>
            <div style="font-size:0.8rem;color:var(--text-muted);display:flex;gap:12px;flex-wrap:wrap;">
              <span>Deposit: <strong style="color:var(--text-secondary)">₹${(r.deposit||0).toLocaleString('en-IN')}</strong></span>
              <span>Maint: <strong style="color:var(--text-secondary)">₹${(r.maintenance||0).toLocaleString('en-IN')}</strong></span>
            </div>
            <div class="card-specs">
              <span class="spec-item">🛏 ${r.bedroom} BHK</span>
              <span class="spec-item">📐 ${r.carpet_area} sqft</span>
              <span class="spec-item">🛋 ${r.furnishing}</span>
            </div>
          </div>
        </div>`;
    }).join('');

    renderPaginationIn('rentals-pagination', data.total, f.offset, f.limit, 'onRentalsPageChange');
  } catch (e) { console.error('fetchRentals:', e); }
}

function onRentalsFilterChange() {
  state.rentalsFilter.locality   = document.getElementById('r-filter-locality').value;
  state.rentalsFilter.bhk        = document.getElementById('r-filter-bhk').value;
  state.rentalsFilter.furnishing = document.getElementById('r-filter-furnishing').value;
  state.rentalsFilter.offset = 0;
  updateRentalsResetBtn();
  fetchAndRenderRentals();
}

function onRentalsSortChange() {
  const [sort_by, order] = document.getElementById('r-filter-sort').value.split(':');
  state.rentalsFilter.sort_by = sort_by;
  state.rentalsFilter.order   = order;
  state.rentalsFilter.offset  = 0;
  fetchAndRenderRentals();
}

function resetRentalsFilters() {
  const f = state.rentalsFilter;
  f.locality = ''; f.bhk = ''; f.furnishing = ''; f.offset = 0;
  ['r-filter-locality','r-filter-bhk','r-filter-furnishing'].forEach(id => { const el = document.getElementById(id); if(el) el.value=''; });
  updateRentalsResetBtn();
  fetchAndRenderRentals();
}

function updateRentalsResetBtn() {
  const btn = document.getElementById('r-reset-btn');
  if (!btn) return;
  const f = state.rentalsFilter;
  const active = [f.locality, f.bhk, f.furnishing].filter(Boolean).length;
  btn.innerHTML = active ? `✕ Reset <span style="background:var(--indigo);color:#fff;border-radius:99px;padding:1px 6px;font-size:0.7rem;font-weight:800;margin-left:4px;">${active}</span>` : '✕ Reset';
  btn.style.color = active ? 'var(--indigo)' : '';
  btn.style.borderColor = active ? 'rgba(129,140,248,0.4)' : '';
}

function onRentalsPageChange(newOffset) {
  state.rentalsFilter.offset = newOffset;
  fetchAndRenderRentals();
  window.scrollTo({ top: 280, behavior: 'smooth' });
}
