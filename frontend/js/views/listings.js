// ═══════════════════════════════════════════════════════
//  Ivy Homes — Listings View Module
// ═══════════════════════════════════════════════════════

async function loadListingsView() {
  const container = document.getElementById('view-container');
  container.innerHTML = `
    <div class="hero-section">
      <div class="hero-eyebrow">🌿 Bangalore Real Estate · ${new Date().getFullYear()}</div>
      <h1 class="hero-title">Discover Your Perfect Home</h1>
      <p class="hero-subtitle">Verified listings with accurate carpet areas, real prices, and fraud-free properties across Bangalore's prime localities.</p>
    </div>

    <div class="glass-card filter-bar">
      <div class="filter-group">
        <label class="filter-label">📍 Locality</label>
        <select id="filter-locality" onchange="onFilterChange()">
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
        <select id="filter-bhk" onchange="onFilterChange()">
          <option value="">Any BHK</option>
          <option value="1">1 BHK</option>
          <option value="2">2 BHK</option>
          <option value="3">3 BHK</option>
          <option value="4">4 BHK</option>
          <option value="5">5+ BHK</option>
        </select>
      </div>
      <div class="filter-group">
        <label class="filter-label">🏘 Type</label>
        <select id="filter-pt" onchange="onFilterChange()">
          <option value="">All Types</option>
          <option value="apartment">Apartment</option>
          <option value="villa">Villa</option>
          <option value="independent house">Independent House</option>
          <option value="builder floor">Builder Floor</option>
          <option value="plot">Plot</option>
        </select>
      </div>
      <div class="filter-group">
        <label class="filter-label">🛋 Furnishing</label>
        <select id="filter-furnishing" onchange="onFilterChange()">
          <option value="">Any Furnishing</option>
          <option value="unfurnished">Unfurnished</option>
          <option value="semi-furnished">Semi-Furnished</option>
          <option value="fully-furnished">Fully-Furnished</option>
        </select>
      </div>
      <div class="filter-group" style="min-width:120px;">
        <label class="filter-label">💰 Min Price (₹)</label>
        <select id="filter-min-price" onchange="onFilterChange()">
          <option value="">No Min</option>
          <option value="1000000">₹10 L+</option>
          <option value="2500000">₹25 L+</option>
          <option value="5000000">₹50 L+</option>
          <option value="10000000">₹1 Cr+</option>
          <option value="20000000">₹2 Cr+</option>
          <option value="50000000">₹5 Cr+</option>
        </select>
      </div>
      <div class="filter-group" style="min-width:120px;">
        <label class="filter-label">💰 Max Price (₹)</label>
        <select id="filter-max-price" onchange="onFilterChange()">
          <option value="">No Max</option>
          <option value="2500000">Up to ₹25 L</option>
          <option value="5000000">Up to ₹50 L</option>
          <option value="10000000">Up to ₹1 Cr</option>
          <option value="20000000">Up to ₹2 Cr</option>
          <option value="50000000">Up to ₹5 Cr</option>
          <option value="100000000">Up to ₹10 Cr</option>
        </select>
      </div>
      <div class="filter-group">
        <label class="filter-label">↕ Sort</label>
        <select id="filter-sort" onchange="onSortChange()">
          <option value="posted_at:desc">Latest Listed</option>
          <option value="price:asc">Price: Low → High</option>
          <option value="price:desc">Price: High → Low</option>
          <option value="carpet_area:desc">Largest Area First</option>
          <option value="bedroom:desc">Most Bedrooms</option>
        </select>
      </div>
      <div class="filter-group" style="flex:0;min-width:auto;justify-content:flex-end;">
        <label class="filter-label" style="visibility:hidden;">Reset</label>
        <button class="btn btn-ghost btn-sm" id="reset-filters-btn" onclick="resetFilters()" style="border:1px solid var(--border-color);white-space:nowrap;">✕ Reset</button>
      </div>
    </div>

    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:18px;">
      <span id="listings-count-label" style="color:var(--text-muted);font-size:0.9rem;">Loading listings…</span>
      <div style="display:flex;gap:8px;">
        <span class="chip green">✓ Fraud-filtered</span>
        <span class="chip indigo">📐 Area-corrected</span>
      </div>
    </div>

    <div id="listings-grid" class="property-grid">${skeletonCards(12)}</div>
    <div id="pagination-container" class="pagination-controls"></div>`;

  if (state.listingsFilter.locality)      document.getElementById('filter-locality').value    = state.listingsFilter.locality;
  if (state.listingsFilter.bhk)           document.getElementById('filter-bhk').value          = state.listingsFilter.bhk;
  if (state.listingsFilter.property_type) document.getElementById('filter-pt').value           = state.listingsFilter.property_type;
  if (state.listingsFilter.furnishing)    document.getElementById('filter-furnishing').value   = state.listingsFilter.furnishing;
  if (state.listingsFilter.min_price)     document.getElementById('filter-min-price').value    = state.listingsFilter.min_price;
  if (state.listingsFilter.max_price)     document.getElementById('filter-max-price').value    = state.listingsFilter.max_price;
  updateResetBtn();

  await fetchAndRenderListings();
}

async function fetchAndRenderListings() {
  const f = state.listingsFilter;
  const q = new URLSearchParams();
  if (f.locality)       q.append('locality',   f.locality);
  if (f.bhk)            q.append('bhk',        f.bhk);
  if (f.property_type)  q.append('property_type', f.property_type);
  if (f.furnishing)     q.append('furnishing', f.furnishing);
  if (f.min_price)      q.append('min_price',  f.min_price);
  if (f.max_price)      q.append('max_price',  f.max_price);
  q.append('sort_by', f.sort_by);
  q.append('order',   f.order);
  q.append('offset',  f.offset);
  q.append('limit',   f.limit);

  try {
    const res  = await apiFetch(`/api/listings?${q}`);
    if (!res || !res.ok) return;
    const data = await res.json();

    const label = document.getElementById('listings-count-label');
    if (label) label.innerHTML = `Showing <strong style="color:var(--text-primary)">${data.results.length}</strong> of <strong style="color:var(--accent)">${data.total.toLocaleString()}</strong> verified active properties`;

    const grid = document.getElementById('listings-grid');
    if (!grid) return;

    if (data.results.length === 0) {
      grid.innerHTML = `<div class="empty-state"><div class="empty-state-icon">🔍</div><div class="empty-state-title">No properties found</div><div class="empty-state-sub">Try adjusting your filters.</div></div>`;
      return;
    }

    grid.innerHTML = data.results.map(l => createListingCard(l)).join('');
    renderFavouriteButtons();
    renderPagination(data.total, f.offset, f.limit, 'onListingsPageChange');
  } catch (e) { console.error('fetchListings:', e); }
}

function onFilterChange() {
  state.listingsFilter.locality      = document.getElementById('filter-locality').value;
  state.listingsFilter.bhk           = document.getElementById('filter-bhk').value;
  state.listingsFilter.property_type = document.getElementById('filter-pt').value;
  state.listingsFilter.furnishing    = document.getElementById('filter-furnishing').value;
  state.listingsFilter.min_price     = document.getElementById('filter-min-price').value;
  state.listingsFilter.max_price     = document.getElementById('filter-max-price').value;
  state.listingsFilter.offset = 0;
  updateResetBtn();
  fetchAndRenderListings();
}

function resetFilters() {
  const f = state.listingsFilter;
  f.locality = ''; f.bhk = ''; f.property_type = ''; f.furnishing = '';
  f.min_price = ''; f.max_price = ''; f.offset = 0;
  ['filter-locality','filter-bhk','filter-pt','filter-furnishing','filter-min-price','filter-max-price']
    .forEach(id => { const el = document.getElementById(id); if (el) el.value = ''; });
  updateResetBtn();
  fetchAndRenderListings();
}

function updateResetBtn() {
  const btn = document.getElementById('reset-filters-btn');
  if (!btn) return;
  const f = state.listingsFilter;
  const active = [f.locality, f.bhk, f.property_type, f.furnishing, f.min_price, f.max_price].filter(Boolean).length;
  btn.innerHTML = active ? `✕ Reset <span style="background:var(--accent);color:#022c20;border-radius:99px;padding:1px 6px;font-size:0.7rem;font-weight:800;margin-left:4px;">${active}</span>` : '✕ Reset';
  btn.style.color = active ? 'var(--accent)' : '';
  btn.style.borderColor = active ? 'rgba(34,211,165,0.4)' : '';
}

function onSortChange() {
  const [sort_by, order] = document.getElementById('filter-sort').value.split(':');
  state.listingsFilter.sort_by = sort_by;
  state.listingsFilter.order   = order;
  state.listingsFilter.offset  = 0;
  fetchAndRenderListings();
}

function onListingsPageChange(newOffset) {
  state.listingsFilter.offset = newOffset;
  fetchAndRenderListings();
  window.scrollTo({ top: 280, behavior: 'smooth' });
}
