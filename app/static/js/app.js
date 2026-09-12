// ═══════════════════════════════════════════════════════
//  Ivy Homes Property Portal — Premium SPA v2.0
//  Author: Vishal Kumar Gaud · Sep 2026
// ═══════════════════════════════════════════════════════

// ── Property type → gradient/icon mapping ──
const PROPERTY_THEMES = {
  apartment:          { icon: '🏢', gradient: 'linear-gradient(135deg, #0f2027 0%, #1a3a4a 60%, #0d2635 100%)' },
  villa:              { icon: '🏡', gradient: 'linear-gradient(135deg, #1a2a1a 0%, #2d4a2d 60%, #1a2a1a 100%)' },
  'independent house':{ icon: '🏠', gradient: 'linear-gradient(135deg, #1c1a0f 0%, #3a2f0f 60%, #1c1a0f 100%)' },
  'builder floor':    { icon: '🏗️', gradient: 'linear-gradient(135deg, #0f1a2a 0%, #1a2a4a 60%, #0f1a2a 100%)' },
  plot:               { icon: '🌳', gradient: 'linear-gradient(135deg, #0a1f0a 0%, #152d15 60%, #0a1f0a 100%)' },
};

const LOCALITY_COLORS = {
  whitefield: '#22d3a5', koramangala: '#818cf8', indiranagar: '#f59e0b',
  'hsr layout': '#34d399', bellandur: '#60a5fa', 'electronic city': '#a78bfa',
  'jp nagar': '#f87171', hebbal: '#fb923c', yelahanka: '#2dd4bf',
  'sarjapur road': '#e879f9',
};

// ── Format listing with unit conversion ──
function formatListingClient(l) {
  if (!l) return {};
  const c   = l.carpet_area || 0;
  const pt  = (l.property_type || '').toLowerCase();
  let is_sqm = l.is_unit_sqm || false;
  let c_sqft = l.carpet_area_sqft || c;
  if (pt !== 'plot' && l.website === 'magichomes' && c < 300) {
    is_sqm = true;
    c_sqft = Math.round(c * 10.7639104 * 10) / 10;
  }
  const price = l.price || 0;
  const ppsq  = l.price_per_sqft || ((c_sqft && price > 0) ? Math.round(price / c_sqft) : 0);
  return {
    ...l,
    carpet_area_sqft: c_sqft,
    is_unit_sqm: is_sqm,
    price_per_sqft: ppsq,
    price_formatted: l.price_formatted || `₹${price.toLocaleString('en-IN')}`,
  };
}

function fmtINR(n) {
  if (!n) return '₹0';
  if (n >= 10000000) return `₹${(n/10000000).toFixed(2)} Cr`;
  if (n >= 100000)   return `₹${(n/100000).toFixed(2)} L`;
  return `₹${n.toLocaleString('en-IN')}`;
}

// ── App state ──
const state = {
  user:          JSON.parse(localStorage.getItem('ivy_user')) || null,
  accessToken:   localStorage.getItem('ivy_access_token')  || null,
  refreshToken:  localStorage.getItem('ivy_refresh_token') || null,
  currentRoute:  'listings',
  currentListingId: null,
  savedListingIds: new Set(),
  listingsFilter: { locality:'', bhk:'', property_type:'', min_price:'', max_price:'', furnishing:'', sort_by:'posted_at', order:'desc', offset:0, limit:12 },
  rentalsFilter:  { locality:'', bhk:'', furnishing:'', sort_by:'price', order:'asc', offset:0, limit:12 },
  projectsFilter: { locality:'', project_status:'', sort_by:'price_max', order:'desc', offset:0, limit:12 },
};

// ── API helper with token auto-refresh ──
async function apiFetch(endpoint, options = {}) {
  const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
  if (state.accessToken) headers['Authorization'] = `Bearer ${state.accessToken}`;

  let response = await fetch(endpoint, { ...options, headers });

  if (response.status === 401 && state.refreshToken && !endpoint.includes('/auth/')) {
    const refreshRes = await fetch('/api/auth/refresh', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh_token: state.refreshToken }),
    });
    if (refreshRes.ok) {
      setSession(await refreshRes.json());
      headers['Authorization'] = `Bearer ${state.accessToken}`;
      response = await fetch(endpoint, { ...options, headers });
    } else {
      logout();
      return null;
    }
  }
  return response;
}

// ── Session management ──
function setSession(data) {
  state.accessToken  = data.access_token;
  state.refreshToken = data.refresh_token;
  state.user         = data.user;
  localStorage.setItem('ivy_access_token',  data.access_token);
  localStorage.setItem('ivy_refresh_token', data.refresh_token);
  localStorage.setItem('ivy_user', JSON.stringify(data.user));
  updateAuthUI();
  fetchSavedIds();
}

function logout() {
  state.accessToken = null;
  state.refreshToken = null;
  state.user = null;
  state.savedListingIds.clear();
  localStorage.removeItem('ivy_access_token');
  localStorage.removeItem('ivy_refresh_token');
  localStorage.removeItem('ivy_user');
  updateAuthUI();
  navigate('listings');
}

// ── Auth UI ──
function updateAuthUI() {
  const c = document.getElementById('nav-auth-container');
  if (!c) return;
  if (state.user) {
    const initials = state.user.email.charAt(0).toUpperCase();
    c.innerHTML = `
      <div style="display:flex;align-items:center;gap:10px;">
        <div style="display:flex;align-items:center;gap:8px;background:rgba(255,255,255,0.06);border:1px solid var(--border-color);padding:5px 12px 5px 6px;border-radius:99px;">
          <div style="width:26px;height:26px;border-radius:50%;background:linear-gradient(135deg,var(--accent),var(--indigo));display:flex;align-items:center;justify-content:center;font-size:0.75rem;font-weight:800;color:#022c20;">${initials}</div>
          <span style="font-size:0.83rem;color:var(--text-secondary);max-width:140px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${state.user.email}</span>
        </div>
        <button class="btn btn-ghost btn-sm" onclick="logout()">Sign out</button>
      </div>`;
  } else {
    c.innerHTML = `<button class="btn btn-primary btn-sm" onclick="openLoginModal()">Sign in</button>`;
  }
}

// ── Router ──
function navigate(route, id = null) {
  state.currentRoute = route;
  state.currentListingId = id;
  window.location.hash = id ? `${route}/${id}` : route;
  document.querySelectorAll('.nav-item').forEach(el =>
    el.classList.toggle('active', el.dataset.route === route)
  );
  renderView();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function handleHashChange() {
  const hash  = window.location.hash.replace('#', '') || 'listings';
  const parts = hash.split('/');
  state.currentRoute    = parts[0];
  state.currentListingId = parts[1] || null;
  document.querySelectorAll('.nav-item').forEach(el =>
    el.classList.toggle('active', el.dataset.route === parts[0])
  );
  renderView();
}

// ── Favourites ──
async function fetchSavedIds() {
  if (!state.accessToken) return;
  try {
    const res = await apiFetch('/api/saved');
    if (res && res.ok) {
      const data = await res.json();
      state.savedListingIds = new Set((data.results || []).map(r => r.listing_id));
      renderFavouriteButtons();
    }
  } catch (e) { console.error('fetchSavedIds:', e); }
}

async function toggleSave(listingId, event) {
  if (event) { event.stopPropagation(); event.preventDefault(); }
  if (!state.user) { openLoginModal(); return; }

  const isSaved = state.savedListingIds.has(listingId);
  try {
    if (isSaved) {
      const res = await apiFetch(`/api/saved/${listingId}`, { method: 'DELETE' });
      if (res && res.ok) state.savedListingIds.delete(listingId);
    } else {
      const res = await apiFetch('/api/saved', { method: 'POST', body: JSON.stringify({ listing_id: listingId }) });
      if (res && res.ok) state.savedListingIds.add(listingId);
    }
    renderFavouriteButtons();
    const btn = document.getElementById('detail-save-btn');
    if (btn) {
      const ns = state.savedListingIds.has(listingId);
      btn.innerHTML = ns ? '❤️&nbsp; Saved' : '🤍&nbsp; Save Property';
      btn.style.background = ns ? 'rgba(239,68,68,0.15)' : '';
      btn.style.color = ns ? 'var(--danger)' : '';
    }
    if (state.currentRoute === 'saved') loadSavedView();
  } catch (e) { console.error('toggleSave:', e); }
}

function renderFavouriteButtons() {
  document.querySelectorAll('.favourite-btn').forEach(btn => {
    const id = btn.dataset.id;
    const s  = state.savedListingIds.has(id);
    btn.classList.toggle('saved', s);
    btn.innerHTML = s ? '❤️' : '🤍';
  });
}

// ── View Router ──
function renderView() {
  const container = document.getElementById('view-container');
  if (!container) return;
  switch (state.currentRoute) {
    case 'listings':       loadListingsView();                              break;
    case 'listing-detail': loadListingDetailView(state.currentListingId);  break;
    case 'rentals':        loadRentalsView();                               break;
    case 'projects':       loadProjectsView();                              break;
    case 'saved':          loadSavedView();                                 break;
    case 'insights':       loadInsightsView();                              break;
    case 'findings':       loadFindingsView();                              break;
    case 'answers':        loadAnswersView();                               break;
    default:               loadListingsView();
  }
}

// ════════════════════════════════════════════════════════
//  SKELETON CARD HELPER
// ════════════════════════════════════════════════════════
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

// ════════════════════════════════════════════════════════
//  LISTING CARD
// ════════════════════════════════════════════════════════
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
          <span class="badge badge-source">${(l.website || 'Portal').replace('100acres','100acres').toUpperCase()}</span>
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

// ════════════════════════════════════════════════════════
//  1. LISTINGS VIEW
// ════════════════════════════════════════════════════════
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

// ════════════════════════════════════════════════════════
//  2. LISTING DETAIL VIEW
// ════════════════════════════════════════════════════════
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

// ════════════════════════════════════════════════════════
//  3. RENTALS VIEW  (with filters)
// ════════════════════════════════════════════════════════
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

  // Restore saved filter values
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

// ════════════════════════════════════════════════════════
//  4. PROJECTS VIEW  (with filters)
// ════════════════════════════════════════════════════════
const PROJ_GRADIENTS = [
  'linear-gradient(135deg,#0f1a2a,#1a2a4a)',
  'linear-gradient(135deg,#1a0f2a,#2a1a4a)',
  'linear-gradient(135deg,#0f2a1a,#1a4a2a)',
  'linear-gradient(135deg,#2a1a0f,#4a2a1a)',
];

async function loadProjectsView() {
  const container = document.getElementById('view-container');
  container.innerHTML = `
    <div class="hero-section">
      <div class="hero-eyebrow">🏗️ Builder Projects</div>
      <h1 class="hero-title">Residential Developments</h1>
      <p class="hero-subtitle">Top builder projects in Bangalore with corrected Crore pricing, RERA registration, and verified listing counts.</p>
    </div>

    <div class="glass-card filter-bar">
      <div class="filter-group">
        <label class="filter-label">📍 Locality</label>
        <select id="p-filter-locality" onchange="onProjectsFilterChange()">
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
        <label class="filter-label">🏗 Status</label>
        <select id="p-filter-status" onchange="onProjectsFilterChange()">
          <option value="">All Statuses</option>
          <option value="under construction">Under Construction</option>
          <option value="completed">Completed</option>
          <option value="pre-launch">Pre-Launch</option>
        </select>
      </div>
      <div class="filter-group">
        <label class="filter-label">↕ Sort</label>
        <select id="p-filter-sort" onchange="onProjectsSortChange()">
          <option value="price_max:desc">Price: High → Low</option>
          <option value="price_max:asc">Price: Low → High</option>
          <option value="total_units:desc">Most Units</option>
          <option value="launch_date:desc">Newest Launch</option>
        </select>
      </div>
      <div class="filter-group" style="flex:0;min-width:auto;">
        <label class="filter-label" style="visibility:hidden;">Reset</label>
        <button class="btn btn-ghost btn-sm" id="p-reset-btn" onclick="resetProjectsFilters()" style="border:1px solid var(--border-color);white-space:nowrap;">✕ Reset</button>
      </div>
    </div>

    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:18px;">
      <span id="projects-count-label" style="color:var(--text-muted);font-size:0.9rem;">Loading projects…</span>
      <div style="display:flex;gap:8px;">
        <span class="chip" style="background:var(--violet-dim);color:var(--violet);border-color:rgba(167,139,250,0.2);">💡 Prices in Crores (corrected)</span>
        <span class="chip yellow">⚠️ Count mismatch = wrong in API</span>
      </div>
    </div>

    <div id="projects-grid" class="property-grid">${skeletonCards(12)}</div>
    <div id="projects-pagination" class="pagination-controls"></div>`;

  if (state.projectsFilter.locality)       document.getElementById('p-filter-locality').value = state.projectsFilter.locality;
  if (state.projectsFilter.project_status) document.getElementById('p-filter-status').value   = state.projectsFilter.project_status;
  updateProjectsResetBtn();

  await fetchAndRenderProjects();
}

async function fetchAndRenderProjects() {
  const f = state.projectsFilter;
  const q = new URLSearchParams();
  if (f.locality)       q.append('locality',       f.locality);
  if (f.project_status) q.append('project_status', f.project_status);
  q.append('sort_by', f.sort_by);
  q.append('order',   f.order);
  q.append('offset',  f.offset);
  q.append('limit',   f.limit);

  try {
    const res  = await apiFetch(`/api/projects?${q}`);
    if (!res || !res.ok) return;
    const data = await res.json();

    const label = document.getElementById('projects-count-label');
    if (label) label.innerHTML = `Showing <strong style="color:var(--text-primary)">${data.results.length}</strong> of <strong style="color:var(--violet)">${data.total.toLocaleString()}</strong> builder projects`;

    const grid = document.getElementById('projects-grid');
    if (!grid) return;

    if (!data.results.length) {
      grid.innerHTML = `<div class="empty-state"><div class="empty-state-icon">🏗️</div><div class="empty-state-title">No projects match your filters.</div><button class="btn btn-secondary" style="margin-top:16px;" onclick="resetProjectsFilters()">Clear Filters</button></div>`;
      return;
    }

    grid.innerHTML = data.results.map((p, i) => {
      const statusColor = p.project_status === 'completed'          ? 'var(--success)' :
                          p.project_status === 'under construction' ? 'var(--warning)' : 'var(--indigo)';
      const countMatch = p.actual_total_listings === p.total_listings;
      const locColor   = LOCALITY_COLORS[(p.locality || '').toLowerCase()] || 'var(--violet)';
      return `
        <div class="glass-card project-card fade-in">
          <div class="project-hero" style="background:${PROJ_GRADIENTS[i%4]}">
            <span style="font-size:3rem;filter:drop-shadow(0 4px 16px rgba(0,0,0,0.5));">🏗️</span>
            <div style="position:absolute;bottom:0;left:0;right:0;height:50px;background:linear-gradient(to bottom,transparent,rgba(9,13,24,0.9));"></div>
            <div class="project-status-badge" style="color:${statusColor};background:rgba(0,0,0,0.35);border-color:${statusColor}40;">
              ${(p.project_status||'Active').toUpperCase()}
            </div>
          </div>
          <div class="card-body">
            <div class="card-price" style="color:var(--violet);">${p.price_range_formatted || '—'}</div>
            <h3 class="card-title">${p.apartment_name || 'Builder Project'}</h3>
            <div style="font-size:0.8rem;color:var(--text-muted);margin-bottom:2px;">by <strong style="color:var(--text-secondary)">${p.developer_name || '—'}</strong></div>
            <div class="card-location">
              <span style="width:8px;height:8px;border-radius:50%;background:${locColor};display:inline-block;flex-shrink:0;"></span>
              ${(p.locality || 'Bangalore').toUpperCase()}
            </div>
            <div style="font-size:0.75rem;color:var(--text-muted);font-family:monospace;margin:2px 0;">RERA: ${p.rera_number || 'Registered'}</div>
            <div class="card-specs">
              <span class="spec-item">🏢 ${p.total_units||0} Units</span>
              <span class="spec-item">🗼 ${p.total_towers||0} Towers</span>
              <span class="spec-item ${countMatch ? '' : 'text-warning'}" title="${countMatch ? 'Count verified' : '⚠️ count disagrees with API'}">
                ${countMatch ? '✓' : '⚠️'} ${p.actual_total_listings} listings
              </span>
            </div>
          </div>
        </div>`;
    }).join('');

    renderPaginationIn('projects-pagination', data.total, f.offset, f.limit, 'onProjectsPageChange');
  } catch (e) { console.error('fetchProjects:', e); }
}

function onProjectsFilterChange() {
  state.projectsFilter.locality       = document.getElementById('p-filter-locality').value;
  state.projectsFilter.project_status = document.getElementById('p-filter-status').value;
  state.projectsFilter.offset = 0;
  updateProjectsResetBtn();
  fetchAndRenderProjects();
}

function onProjectsSortChange() {
  const [sort_by, order] = document.getElementById('p-filter-sort').value.split(':');
  state.projectsFilter.sort_by = sort_by;
  state.projectsFilter.order   = order;
  state.projectsFilter.offset  = 0;
  fetchAndRenderProjects();
}

function resetProjectsFilters() {
  const f = state.projectsFilter;
  f.locality = ''; f.project_status = ''; f.offset = 0;
  ['p-filter-locality','p-filter-status'].forEach(id => { const el = document.getElementById(id); if(el) el.value=''; });
  updateProjectsResetBtn();
  fetchAndRenderProjects();
}

function updateProjectsResetBtn() {
  const btn = document.getElementById('p-reset-btn');
  if (!btn) return;
  const f = state.projectsFilter;
  const active = [f.locality, f.project_status].filter(Boolean).length;
  btn.innerHTML = active ? `✕ Reset <span style="background:var(--violet);color:#fff;border-radius:99px;padding:1px 6px;font-size:0.7rem;font-weight:800;margin-left:4px;">${active}</span>` : '✕ Reset';
  btn.style.color = active ? 'var(--violet)' : '';
  btn.style.borderColor = active ? 'rgba(167,139,250,0.4)' : '';
}

function onProjectsPageChange(newOffset) {
  state.projectsFilter.offset = newOffset;
  fetchAndRenderProjects();
  window.scrollTo({ top: 280, behavior: 'smooth' });
}

// ════════════════════════════════════════════════════════
//  5. SAVED / FAVOURITES VIEW
// ════════════════════════════════════════════════════════
async function loadSavedView() {
  const container = document.getElementById('view-container');

  if (!state.user) {
    container.innerHTML = `
      <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:60vh;gap:20px;text-align:center;">
        <div style="font-size:4rem;opacity:0.4;">❤️</div>
        <h2 style="font-family:var(--font-display);font-size:2rem;font-weight:800;">Sign in to Save Properties</h2>
        <p style="color:var(--text-secondary);max-width:400px;line-height:1.7;">Your saved listings are synced to your account and available across sessions.</p>
        <button class="btn btn-primary btn-lg" onclick="openLoginModal()">Sign In with Demo Account</button>
      </div>`;
    return;
  }

  container.innerHTML = `
    <div class="hero-section">
      <div class="hero-eyebrow">❤️ Saved Properties</div>
      <h1 class="hero-title">Your Favourites</h1>
      <p class="hero-subtitle">Saved on: <strong>${state.user.email}</strong> · Synced across sessions.</p>
    </div>
    <div id="saved-grid" class="property-grid">${skeletonCards(6)}</div>`;

  try {
    const res  = await apiFetch('/api/saved');
    if (!res || !res.ok) return;
    const data = await res.json();
    const grid = document.getElementById('saved-grid');
    if (!grid) return;

    if (!data.results || !data.results.length) {
      grid.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">🤍</div>
          <div class="empty-state-title">No saved properties yet</div>
          <div class="empty-state-sub">Browse listings and click ❤️ to save your favourites.</div>
          <button class="btn btn-primary" style="margin-top:20px;" onclick="navigate('listings')">Browse Properties</button>
        </div>`;
      return;
    }

    grid.innerHTML = data.results.map(l => createListingCard(formatListingClient(l))).join('');
    renderFavouriteButtons();
  } catch (e) { console.error('loadSaved:', e); }
}

// ════════════════════════════════════════════════════════
//  6. INSIGHTS VIEW
// ════════════════════════════════════════════════════════
async function loadInsightsView() {
  const container = document.getElementById('view-container');
  container.innerHTML = `<div class="hero-section"><div class="hero-eyebrow">📊 Market Intelligence</div><h1 class="hero-title">Bangalore Real Estate Insights</h1></div><div style="text-align:center;padding:40px;color:var(--text-muted);">Computing insights…</div>`;

  try {
    const res  = await apiFetch('/api/insights/summary');
    if (!res || !res.ok) return;
    const data = await res.json();

    const topLoc  = data.locality_breakdown.slice(0, 8);
    const maxCount = Math.max(...topLoc.map(l => l.count), 1);

    const insightsHTML = `
      <div class="hero-section">
        <div class="hero-eyebrow">📊 Market Intelligence</div>
        <h1 class="hero-title">Bangalore Real Estate Insights</h1>
        <p class="hero-subtitle">Aggregated analytics from ${(data.total_listings).toLocaleString()} listings · corrected for units, fraud, and data quality.</p>
      </div>

      <!-- Key Stats -->
      <div class="stats-strip" style="margin-bottom:36px;">
        ${[
          { icon:'🏠', label:'Total Listings',     value: data.total_listings.toLocaleString(),  sub:'Retrieved' },
          { icon:'✅', label:'Active & Live',       value: data.active_listings.toLocaleString(), sub:'is_live = true', accent:true },
          { icon:'🔑', label:'Rental Properties',  value: data.total_rentals.toLocaleString(),   sub:'Monthly' },
          { icon:'🏗️', label:'Builder Projects',  value: data.total_projects.toLocaleString(),  sub:'Developments' },
          { icon:'🔍', label:'API Discrepancies',  value: data.findings_count,                   sub:'Proven findings', warn:true },
        ].map(s => `
          <div class="glass-card stat-box">
            <div class="stat-icon">${s.icon}</div>
            <div class="stat-label">${s.label}</div>
            <div class="stat-value" style="${s.accent?'color:var(--accent)':s.warn?'color:var(--warning)':''}">${s.value}</div>
            <div class="stat-sub">${s.sub}</div>
          </div>`).join('')}
      </div>

      <div class="insights-grid">
        <!-- Locality Benchmark -->
        <div class="glass-card" style="padding:24px;">
          <div class="section-heading">🏙️ Locality Price Benchmark</div>
          ${topLoc.map(loc => `
            <div class="mini-bar-wrap">
              <div class="mini-bar-label">${loc.locality}</div>
              <div class="mini-bar-track">
                <div class="mini-bar-fill" style="width:${Math.round(loc.count/maxCount*100)}%;"></div>
              </div>
              <div class="mini-bar-value">${loc.count}</div>
            </div>`).join('')}
          <div class="divider"></div>
          <div class="table-responsive">
            <table class="custom-table">
              <thead><tr><th>Locality</th><th>Listings</th><th>Median Price</th></tr></thead>
              <tbody>
                ${topLoc.map(loc => `
                  <tr>
                    <td><strong>${loc.locality}</strong></td>
                    <td><span class="chip">${loc.count}</span></td>
                    <td style="color:var(--accent);font-weight:700;">${loc.median_price_formatted}</td>
                  </tr>`).join('')}
              </tbody>
            </table>
          </div>
        </div>

        <!-- BHK Distribution -->
        <div class="glass-card" style="padding:24px;">
          <div class="section-heading">🛏️ BHK Distribution</div>
          <div style="display:flex;flex-direction:column;gap:16px;margin-top:8px;">
            ${data.bhk_distribution.map(b => {
              const pct = ((b.count / (data.active_listings||1)) * 100).toFixed(1);
              return `
                <div>
                  <div style="display:flex;justify-content:space-between;font-size:0.9rem;margin-bottom:6px;">
                    <span style="color:var(--text-primary);font-weight:600;">${b.bhk}</span>
                    <span style="color:var(--text-muted);"><strong style="color:var(--text-secondary)">${b.count.toLocaleString()}</strong> · ${pct}%</span>
                  </div>
                  <div style="height:8px;background:rgba(255,255,255,0.06);border-radius:4px;overflow:hidden;">
                    <div style="width:${pct}%;height:100%;background:linear-gradient(90deg,var(--accent),var(--indigo));border-radius:4px;transition:width 0.8s ease;"></div>
                  </div>
                </div>`;
            }).join('')}
          </div>

          <div class="divider"></div>
          <div class="section-heading" style="font-size:1rem;">🧠 Data Quality Summary</div>
          <div style="display:flex;flex-direction:column;gap:10px;">
            ${[
              { label:'Corrupt listings (impossible data)',   value: data.answers?.corrupt_listing_ids?.length || 40,  color:'var(--danger)' },
              { label:'Fraudulent bait listings',            value: data.answers?.fake_listing_ids?.length || 100,     color:'var(--warning)' },
              { label:'Cross-portal duplicates',             value: 4700-4572,                                          color:'var(--indigo)' },
              { label:'Area in SqM, not SqFt (magichomes)',  value: '~374',                                             color:'var(--violet)' },
              { label:'Projects with wrong listing count',   value: data.answers?.projects_with_wrong_listing_count || 392, color:'var(--warning)' },
            ].map(d => `
              <div style="display:flex;justify-content:space-between;align-items:center;padding:10px 14px;background:rgba(0,0,0,0.2);border-radius:var(--r-sm);border:1px solid var(--border-color);">
                <span style="font-size:0.85rem;color:var(--text-secondary);">${d.label}</span>
                <strong style="color:${d.color};font-family:var(--font-display);font-size:1rem;">${d.value}</strong>
              </div>`).join('')}
          </div>
        </div>
      </div>`;

    container.innerHTML = insightsHTML;
  } catch (e) { console.error('loadInsights:', e); }
}

// ════════════════════════════════════════════════════════
//  7. FINDINGS VIEW
// ════════════════════════════════════════════════════════
async function loadFindingsView() {
  const container = document.getElementById('view-container');
  container.innerHTML = `<div class="hero-section"><h1 class="hero-title">API Documentation Audit</h1></div><div style="text-align:center;padding:40px;color:var(--text-muted);">Loading findings…</div>`;

  try {
    const res = await apiFetch('/api/submission');
    if (!res || !res.ok) return;
    const sub      = await res.json();
    const findings = sub.findings || [];

    const CATEGORY_STYLE = {
      auth:                { color: 'var(--indigo)',  icon: '🔐', cls: 'info' },
      pagination:          { color: 'var(--info)',    icon: '📄', cls: 'info' },
      units:               { color: 'var(--warning)', icon: '📐', cls: 'warning' },
      filters:             { color: 'var(--info)',    icon: '🔎', cls: 'info' },
      sorting:             { color: 'var(--warning)', icon: '↕️', cls: 'warning' },
      timestamps:          { color: 'var(--indigo)',  icon: '🕐', cls: 'info' },
      duplicates:          { color: 'var(--violet)',  icon: '👥', cls: 'purple' },
      completeness:        { color: 'var(--info)',    icon: '📋', cls: 'info' },
      data_quality:        { color: 'var(--danger)',  icon: '💔', cls: 'danger' },
      fraud:               { color: 'var(--danger)',  icon: '🚨', cls: 'danger' },
      consistency:         { color: 'var(--warning)', icon: '⚖️', cls: 'warning' },
      missing_endpoint:    { color: 'var(--warning)', icon: '🔌', cls: 'warning' },
      undocumented_endpoint:{ color: 'var(--accent)', icon: '✨', cls: '' },
    };

    container.innerHTML = `
      <div class="hero-section">
        <div class="hero-eyebrow">🔍 API Audit Report</div>
        <h1 class="hero-title">15 Proven Documentation Discrepancies</h1>
        <p class="hero-subtitle">Systematic comparison of <code style="font-size:0.9em;background:rgba(255,255,255,0.08);padding:2px 8px;border-radius:4px;">API_REFERENCE.md</code> versus live API at <code style="font-size:0.9em;background:rgba(255,255,255,0.08);padding:2px 8px;border-radius:4px;">solve.ivy.homes</code>.</p>
        <div style="display:flex;flex-wrap:wrap;justify-content:center;gap:10px;margin-top:20px;">
          ${['auth','pagination','units','missing_endpoint','sorting','data_quality','fraud','consistency','duplicates','completeness'].map(cat => {
            const st = CATEGORY_STYLE[cat] || {};
            const count = findings.filter(f => f.category === cat).length;
            return count ? `<span class="chip" style="background:${st.color}18;color:${st.color};border-color:${st.color}40;">${st.icon||''} ${cat} (${count})</span>` : '';
          }).join('')}
        </div>
      </div>

      <div style="display:flex;flex-direction:column;gap:14px;">
        ${findings.map((f, i) => {
          const st = CATEGORY_STYLE[f.category] || { color:'var(--accent)', icon:'📌', cls:'' };
          return `
            <div class="glass-card finding-card ${st.cls} fade-in">
              <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:12px;margin-bottom:12px;flex-wrap:wrap;">
                <div style="display:flex;align-items:center;gap:10px;">
                  <div style="width:32px;height:32px;border-radius:8px;background:${st.color}22;display:flex;align-items:center;justify-content:center;font-size:1rem;flex-shrink:0;">${st.icon}</div>
                  <div>
                    <div style="font-size:0.7rem;font-weight:700;text-transform:uppercase;letter-spacing:0.07em;color:${st.color};margin-bottom:2px;">#${i+1} · ${f.category.replace(/_/g,' ')}</div>
                    <code style="font-size:0.95rem;font-weight:700;color:var(--text-primary);">${f.endpoint}</code>
                  </div>
                </div>
                <span class="chip" style="background:${st.color}15;color:${st.color};border-color:${st.color}30;">${f.evidence?.length||0} evidence IDs</span>
              </div>

              <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:12px;">
                <div style="background:rgba(248,113,113,0.07);padding:12px 14px;border-radius:var(--r-sm);border:1px solid rgba(248,113,113,0.15);">
                  <div style="font-size:0.68rem;font-weight:800;text-transform:uppercase;letter-spacing:0.08em;color:var(--danger);margin-bottom:6px;">📄 Documented</div>
                  <p style="font-size:0.86rem;color:var(--text-secondary);line-height:1.6;">${f.documented}</p>
                </div>
                <div style="background:rgba(34,211,165,0.07);padding:12px 14px;border-radius:var(--r-sm);border:1px solid rgba(34,211,165,0.15);">
                  <div style="font-size:0.68rem;font-weight:800;text-transform:uppercase;letter-spacing:0.08em;color:var(--accent);margin-bottom:6px;">✅ Actual API</div>
                  <p style="font-size:0.86rem;color:var(--text-secondary);line-height:1.6;">${f.actual}</p>
                </div>
              </div>

              <div style="font-size:0.82rem;color:var(--text-muted);display:flex;flex-wrap:wrap;gap:16px;">
                <span><strong style="color:var(--text-secondary)">How found:</strong> ${f.how_found}</span>
                <span><strong style="color:var(--text-secondary)">Impact:</strong> ${f.impact}</span>
              </div>

              ${f.evidence?.length ? `
                <div style="margin-top:10px;padding:8px 12px;background:rgba(0,0,0,0.25);border-radius:var(--r-sm);border:1px solid var(--border-color);">
                  <span style="font-size:0.72rem;font-weight:700;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.05em;">Evidence: </span>
                  <code style="font-size:0.78rem;color:var(--text-secondary);word-break:break-all;">${f.evidence.join(' · ')}</code>
                </div>` : ''}
            </div>`;
        }).join('')}
      </div>`;
  } catch (e) { console.error('loadFindings:', e); }
}

// ════════════════════════════════════════════════════════
//  8. ANSWERS VIEW
// ════════════════════════════════════════════════════════
async function loadAnswersView() {
  const container = document.getElementById('view-container');
  container.innerHTML = `<div class="hero-section"><h1 class="hero-title">10 Assignment Questions</h1></div><div style="text-align:center;padding:40px;color:var(--text-muted);">Loading…</div>`;

  try {
    const res = await apiFetch('/api/submission');
    if (!res || !res.ok) return;
    const sub = await res.json();
    const a   = sub.answers;

    const QA = [
      { q:'Total Listing Records',       key:'total_listing_records', val: a.total_listing_records.toLocaleString(),       color:'var(--accent)',  derivation:'Exhaustive offset pagination (94 pages × 50) through /v1/listings until has_more = false.' },
      { q:'Unique Physical Properties',  key:'unique_properties',     val: a.unique_properties.toLocaleString(),           color:'var(--accent)',  derivation:'Clustered 4,700 records on composite key: apartment + floor + bedrooms + bathrooms + facing + normalized carpet area.' },
      { q:'Active Live Listings',        key:'active_listings',       val: a.active_listings.toLocaleString(),             color:'var(--accent)',  derivation:'Count of records with is_live == true. API returns 978 inactive records without filtering.' },
      { q:'Corrupt Listing IDs',         key:'corrupt_listing_ids',   val: `${a.corrupt_listing_ids.length} listings`,     color:'var(--danger)',  derivation:'Domain constraint checks: negative prices, floor > total_floors, carpet > super_built_up, swapped GPS coords outside Bangalore.' },
      { q:'Total Monthly Rent (Yelahanka)', key:'total_monthly_rent', val: `₹${a.total_monthly_rent.toLocaleString('en-IN')}`, color:'var(--accent)', derivation:'Sum of price across all 162 rentals in assigned locality Yelahanka from /v1/rentals.' },
      { q:'Avg Price/SqFt — 2BHK Active', key:'avg_price_per_sqft_2bhk', val:`₹${a.avg_price_per_sqft_2bhk.toLocaleString()} / sqft`, color:'var(--indigo)', derivation:'Mean of price÷carpet_area (sqft) for is_live=true, bedroom=2, excluding Q4 corrupt + Q9 fake, converting magichomes SqM areas × 10.7639.' },
      { q:'Costliest Project',           key:'costliest_project',     val: `${a.costliest_project.project_id} · ₹${(a.costliest_project.price_max_inr/10000000).toFixed(2)} Cr`, color:'var(--violet)', derivation:'Project P10068 (Puravankara Sanctuary) has price_max 99.8 in Crores = ₹99,80,00,000 INR.' },
      { q:'Listings in Last 7 Days',     key:'listings_last_7_days',  val: a.listings_last_7_days,                         color:'var(--accent)',  derivation:'Count posted_at ∈ [2026-09-03T00:00:00+05:30, 2026-09-10T00:00:00+05:30). Lexicographic sort corrected via dateutil.' },
      { q:'Fake Bait Listing IDs',       key:'fake_listing_ids',      val: `${a.fake_listing_ids.length} listings`,        color:'var(--danger)',  derivation:'8 sale listings with price < ₹1,00,000 (rental bait) + 92 listings with advance fee/token amount scam text in description.' },
      { q:'Projects with Wrong Count',   key:'projects_with_wrong_listing_count', val:`${a.projects_with_wrong_listing_count} / 520`, color:'var(--warning)', derivation:'Cross-referenced project.total_listings vs actual count of listings per project_id in /v1/listings.' },
    ];

    container.innerHTML = `
      <div class="hero-section">
        <div class="hero-eyebrow">📝 Assignment Solutions</div>
        <h1 class="hero-title">10 Analytical Questions</h1>
        <p class="hero-subtitle">All answers anchored to <code style="background:rgba(255,255,255,0.08);padding:2px 8px;border-radius:4px;font-size:0.9em;">REFERENCE = 2026-09-10T00:00:00+05:30</code></p>
      </div>

      <div style="display:flex;flex-direction:column;gap:14px;">
        ${QA.map((item, i) => `
          <div class="glass-card answer-card fade-in">
            <div class="answer-num">${i+1}</div>
            <div style="flex:1;">
              <div style="font-size:0.78rem;font-weight:700;text-transform:uppercase;letter-spacing:0.07em;color:var(--text-muted);margin-bottom:4px;">${item.q}</div>
              <div class="answer-value" style="color:${item.color};">${item.val}</div>
              <p style="font-size:0.83rem;color:var(--text-secondary);margin-top:6px;line-height:1.6;">${item.derivation}</p>
            </div>
          </div>`).join('')}
      </div>

      <div class="glass-card" style="margin-top:28px;padding:24px;text-align:center;">
        <div style="font-family:var(--font-display);font-size:1.15rem;font-weight:700;margin-bottom:8px;">Submitted by</div>
        <div style="color:var(--accent);font-size:1.3rem;font-weight:800;">${sub.candidate.name}</div>
        <div style="color:var(--text-secondary);font-size:0.9rem;margin-top:4px;">${sub.candidate.email}</div>
        <div style="margin-top:14px;display:flex;justify-content:center;gap:16px;flex-wrap:wrap;">
          <a href="${sub.candidate.repo_url}" target="_blank" class="btn btn-secondary btn-sm">📁 GitHub Repo</a>
          <a href="${sub.candidate.demo_url}" target="_blank" class="btn btn-primary btn-sm">🌐 Live Demo</a>
        </div>
      </div>`;
  } catch (e) { console.error('loadAnswers:', e); }
}

// ════════════════════════════════════════════════════════
//  PAGINATION  (generic — works for any container ID)
// ════════════════════════════════════════════════════════
function renderPaginationIn(containerId, total, offset, limit, callbackName) {
  const container = document.getElementById(containerId);
  if (!container) return;

  const totalPages  = Math.ceil(total / limit);
  const currentPage = Math.floor(offset / limit) + 1;

  if (totalPages <= 1) { container.innerHTML = ''; return; }

  const pages = [];
  for (let p = Math.max(1, currentPage-2); p <= Math.min(totalPages, currentPage+2); p++) pages.push(p);

  container.innerHTML = `
    <button class="page-btn" ${currentPage===1?'disabled':''} onclick="${callbackName}(0)">«</button>
    <button class="page-btn" ${currentPage===1?'disabled':''} onclick="${callbackName}(${(currentPage-2)*limit})">‹</button>
    ${currentPage > 3 ? `<button class="page-btn" onclick="${callbackName}(0)">1</button><span style="color:var(--text-muted);align-self:center;">…</span>` : ''}
    ${pages.map(p => `<button class="page-btn ${p===currentPage?'active':''}" onclick="${callbackName}(${(p-1)*limit})">${p}</button>`).join('')}
    ${currentPage < totalPages-2 ? `<span style="color:var(--text-muted);align-self:center;">…</span><button class="page-btn" onclick="${callbackName}(${(totalPages-1)*limit})">${totalPages}</button>` : ''}
    <button class="page-btn" ${currentPage===totalPages?'disabled':''} onclick="${callbackName}(${currentPage*limit})">›</button>
    <button class="page-btn" ${currentPage===totalPages?'disabled':''} onclick="${callbackName}(${(totalPages-1)*limit})">»</button>
    <span style="color:var(--text-muted);font-size:0.82rem;align-self:center;">Page ${currentPage} / ${totalPages} &nbsp;·&nbsp; ${total.toLocaleString()} results</span>`;
}

// Backwards-compat alias for Listings view (uses fixed #pagination-container)
function renderPagination(total, offset, limit, callbackName) {
  renderPaginationIn('pagination-container', total, offset, limit, callbackName);
}

// ════════════════════════════════════════════════════════
//  LOGIN MODAL
// ════════════════════════════════════════════════════════
function openLoginModal()  { const m = document.getElementById('login-modal'); if (m) m.style.display='flex'; }
function closeLoginModal() { const m = document.getElementById('login-modal'); if (m) m.style.display='none'; }
function fillDemo(email)   {
  document.getElementById('login-email').value    = email;
  document.getElementById('login-password').value = '5edd65b804';
}

async function submitLogin(e) {
  if (e) e.preventDefault();
  const email    = document.getElementById('login-email').value;
  const password = document.getElementById('login-password').value;
  const errEl    = document.getElementById('login-error');
  const btn      = e?.target?.querySelector('button[type=submit]');
  errEl.innerText = '';
  if (btn) { btn.disabled = true; btn.textContent = 'Signing in…'; }

  try {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    if (!res.ok) {
      const err = await res.json();
      errEl.innerText = err.detail || 'Login failed. Check credentials.';
      if (btn) { btn.disabled = false; btn.textContent = 'Sign In'; }
      return;
    }

    const data = await res.json();
    setSession(data);
    await fetchSavedIds();
    closeLoginModal();
    renderView();
  } catch (err) {
    errEl.innerText = 'Network error — is the server running?';
    if (btn) { btn.disabled = false; btn.textContent = 'Sign In'; }
  }
}

// ════════════════════════════════════════════════════════
//  THEME MANAGEMENT (Starts with Light Theme by default)
// ════════════════════════════════════════════════════════
function initTheme() {
  const current = localStorage.getItem('ivy_theme') || 'light';
  setTheme(current);
}

function setTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  localStorage.setItem('ivy_theme', theme);
  const icon = document.getElementById('theme-icon');
  if (icon) {
    icon.textContent = theme === 'dark' ? '☀️' : '🌙';
  }
}

function toggleTheme() {
  const current = document.documentElement.getAttribute('data-theme') || 'light';
  const next = current === 'light' ? 'dark' : 'light';
  setTheme(next);
}

// ════════════════════════════════════════════════════════
//  NAVBAR SCROLL EFFECT
// ════════════════════════════════════════════════════════
function onScroll() {
  const nav = document.querySelector('.navbar');
  if (nav) nav.classList.toggle('scrolled', window.scrollY > 10);
}

// ════════════════════════════════════════════════════════
//  INITIALISATION
// ════════════════════════════════════════════════════════
window.addEventListener('DOMContentLoaded', () => {
  initTheme();
  updateAuthUI();
  fetchSavedIds();
  window.addEventListener('hashchange', handleHashChange);
  window.addEventListener('scroll', onScroll, { passive: true });
  handleHashChange();
});
