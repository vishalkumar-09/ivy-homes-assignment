// Ivy Homes Frontend Application Logic

function formatListingClient(l) {
  if (!l) return {};
  const c = l.carpet_area || 0;
  const pt = l.property_type || '';
  let is_sqm = l.is_unit_sqm || false;
  let c_sqft = l.carpet_area_sqft || c;
  if (pt !== 'plot' && l.website === 'magichomes' && c < 300) {
    is_sqm = true;
    c_sqft = Math.round(c * 10.7639104 * 10) / 10;
  }
  const price = l.price || 0;
  const ppsq = l.price_per_sqft || ((c_sqft && price > 0) ? Math.round(price / c_sqft) : 0);
  return {
    ...l,
    carpet_area_sqft: c_sqft,
    is_unit_sqm: is_sqm,
    price_per_sqft: ppsq,
    price_formatted: l.price_formatted || `₹${price.toLocaleString()}`
  };
}

const state = {
  user: JSON.parse(localStorage.getItem('ivy_user')) || null,
  accessToken: localStorage.getItem('ivy_access_token') || null,
  refreshToken: localStorage.getItem('ivy_refresh_token') || null,
  currentRoute: 'listings',
  currentListingId: null,
  savedListingIds: new Set(),
  listingsFilter: {
    locality: '',
    bhk: '',
    property_type: '',
    min_price: '',
    max_price: '',
    furnishing: '',
    sort_by: 'posted_at',
    order: 'desc',
    offset: 0,
    limit: 12
  },
  rentalsFilter: {
    locality: '',
    bhk: '',
    furnishing: '',
    sort_by: 'price',
    order: 'asc',
    offset: 0,
    limit: 12
  },
  projectsFilter: {
    locality: '',
    project_status: '',
    sort_by: 'price_max',
    order: 'desc',
    offset: 0,
    limit: 12
  }
};

// API Helper with Auth Interceptor
async function apiFetch(endpoint, options = {}) {
  const headers = options.headers || {};
  if (state.accessToken) {
    headers['Authorization'] = `Bearer ${state.accessToken}`;
  }
  headers['Content-Type'] = 'application/json';

  let response = await fetch(endpoint, { ...options, headers });

  // Handle Token Expiry & Refresh
  if (response.status === 401 && state.refreshToken && !endpoint.includes('/auth/')) {
    console.log('[Auth] Access token expired, attempting refresh...');
    const refreshRes = await fetch('/api/auth/refresh', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh_token: state.refreshToken })
    });

    if (refreshRes.ok) {
      const data = await refreshRes.json();
      setSession(data);
      headers['Authorization'] = `Bearer ${state.accessToken}`;
      response = await fetch(endpoint, { ...options, headers });
    } else {
      logout();
      return null;
    }
  }

  return response;
}

// Session Management
function setSession(data) {
  state.accessToken = data.access_token;
  state.refreshToken = data.refresh_token;
  state.user = data.user;
  localStorage.setItem('ivy_access_token', data.access_token);
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

function updateAuthUI() {
  const authContainer = document.getElementById('nav-auth-container');
  if (!authContainer) return;

  if (state.user) {
    authContainer.innerHTML = `
      <div style="display:flex; align-items:center; gap:10px;">
        <span style="font-size:0.85rem; color:var(--text-secondary); background:rgba(255,255,255,0.06); padding:4px 10px; border-radius:20px;">
          👤 <strong>${state.user.email}</strong>
        </span>
        <button class="btn btn-secondary btn-sm" onclick="logout()">Logout</button>
      </div>
    `;
  } else {
    authContainer.innerHTML = `
      <button class="btn btn-primary btn-sm" onclick="openLoginModal()">Login</button>
    `;
  }
}

// Router
function navigate(route, id = null) {
  state.currentRoute = route;
  state.currentListingId = id;
  window.location.hash = id ? `${route}/${id}` : route;
  
  // Highlight active nav
  document.querySelectorAll('.nav-item').forEach(el => {
    el.classList.toggle('active', el.dataset.route === route);
  });

  renderView();
}

function handleHashChange() {
  const hash = window.location.hash.replace('#', '') || 'listings';
  const parts = hash.split('/');
  navigate(parts[0], parts[1] || null);
}

// Favourites Management
async function fetchSavedIds() {
  if (!state.accessToken) return;
  try {
    const res = await apiFetch('/api/saved');
    if (res && res.ok) {
      const data = await res.json();
      state.savedListingIds = new Set((data.results || []).map(r => r.listing_id));
      renderFavouriteButtons();
    }
  } catch (e) {
    console.error('Error fetching saved:', e);
  }
}

async function toggleSave(listingId, event) {
  if (event) {
    event.stopPropagation();
    event.preventDefault();
  }
  if (!state.user) {
    openLoginModal();
    return;
  }

  const isSaved = state.savedListingIds.has(listingId);
  try {
    if (isSaved) {
      const res = await apiFetch(`/api/saved/${listingId}`, { method: 'DELETE' });
      if (res && res.ok) {
        state.savedListingIds.delete(listingId);
      }
    } else {
      const res = await apiFetch('/api/saved', {
        method: 'POST',
        body: JSON.stringify({ listing_id: listingId })
      });
      if (res && res.ok) {
        state.savedListingIds.add(listingId);
      }
    }
    renderFavouriteButtons();

    const detailBtn = document.getElementById('detail-save-btn');
    if (detailBtn) {
      const nowSaved = state.savedListingIds.has(listingId);
      detailBtn.innerHTML = nowSaved ? '❤️ Saved to Favourites' : '🤍 Save to Favourites';
    }

    if (state.currentRoute === 'saved') {
      loadSavedView();
    }
  } catch (e) {
    console.error('Toggle save error:', e);
  }
}

function renderFavouriteButtons() {
  document.querySelectorAll('.favourite-btn').forEach(btn => {
    const id = btn.dataset.id;
    const isSaved = state.savedListingIds.has(id);
    btn.classList.toggle('saved', isSaved);
    btn.innerHTML = isSaved ? '❤️' : '🤍';
  });
}

// Main View Renderer
function renderView() {
  const container = document.getElementById('view-container');
  if (!container) return;

  switch (state.currentRoute) {
    case 'listings':
      loadListingsView();
      break;
    case 'listing-detail':
      loadListingDetailView(state.currentListingId);
      break;
    case 'rentals':
      loadRentalsView();
      break;
    case 'projects':
      loadProjectsView();
      break;
    case 'saved':
      loadSavedView();
      break;
    case 'insights':
      loadInsightsView();
      break;
    case 'findings':
      loadFindingsView();
      break;
    case 'answers':
      loadAnswersView();
      break;
    default:
      loadListingsView();
  }
}

// 1. LISTINGS VIEW
async function loadListingsView() {
  const container = document.getElementById('view-container');
  container.innerHTML = `
    <div class="hero-section">
      <h1 class="hero-title">Discover Verified Homes in Bangalore</h1>
      <p class="hero-subtitle">Accurate prices, verified carpet areas, and authentic properties across premier localities.</p>
    </div>

    <!-- Filter Bar -->
    <div class="glass-card filter-bar">
      <div class="filter-group">
        <label class="filter-label">Locality</label>
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
        <label class="filter-label">Bedrooms</label>
        <select id="filter-bhk" onchange="onFilterChange()">
          <option value="">Any BHK</option>
          <option value="1">1 BHK</option>
          <option value="2">2 BHK</option>
          <option value="3">3 BHK</option>
          <option value="4">4 BHK</option>
          <option value="5">5 BHK</option>
        </select>
      </div>

      <div class="filter-group">
        <label class="filter-label">Property Type</label>
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
        <label class="filter-label">Furnishing</label>
        <select id="filter-furnishing" onchange="onFilterChange()">
          <option value="">Any Furnishing</option>
          <option value="unfurnished">Unfurnished</option>
          <option value="semi-furnished">Semi-Furnished</option>
          <option value="fully-furnished">Fully-Furnished</option>
        </select>
      </div>

      <div class="filter-group">
        <label class="filter-label">Sort By</label>
        <select id="filter-sort" onchange="onSortChange()">
          <option value="posted_at:desc">Latest Listed</option>
          <option value="price:asc">Price: Low to High</option>
          <option value="price:desc">Price: High to Low</option>
          <option value="carpet_area:desc">Carpet Area: High to Low</option>
          <option value="bedroom:desc">Bedrooms: Most to Least</option>
        </select>
      </div>
    </div>

    <!-- Results Header -->
    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:16px;">
      <span id="listings-count-label" style="color:var(--text-secondary); font-size:0.95rem;">Loading listings...</span>
    </div>

    <!-- Listings Grid -->
    <div id="listings-grid" class="property-grid">
      <div style="grid-column:1/-1; text-align:center; padding:40px; color:var(--text-muted);">Loading real estate listings...</div>
    </div>

    <!-- Pagination -->
    <div id="pagination-container" class="pagination-controls"></div>
  `;

  // Restore filter values into UI
  if (state.listingsFilter.locality) document.getElementById('filter-locality').value = state.listingsFilter.locality;
  if (state.listingsFilter.bhk) document.getElementById('filter-bhk').value = state.listingsFilter.bhk;
  if (state.listingsFilter.property_type) document.getElementById('filter-pt').value = state.listingsFilter.property_type;
  if (state.listingsFilter.furnishing) document.getElementById('filter-furnishing').value = state.listingsFilter.furnishing;

  fetchAndRenderListings();
}

async function fetchAndRenderListings() {
  const f = state.listingsFilter;
  const query = new URLSearchParams();
  if (f.locality) query.append('locality', f.locality);
  if (f.bhk) query.append('bhk', f.bhk);
  if (f.property_type) query.append('property_type', f.property_type);
  if (f.furnishing) query.append('furnishing', f.furnishing);
  if (f.sort_by) query.append('sort_by', f.sort_by);
  if (f.order) query.append('order', f.order);
  query.append('offset', f.offset);
  query.append('limit', f.limit);

  try {
    const res = await apiFetch(`/api/listings?${query.toString()}`);
    if (!res || !res.ok) return;
    const data = await res.json();

    const countLabel = document.getElementById('listings-count-label');
    if (countLabel) {
      countLabel.innerHTML = `Showing <strong>${data.results.length}</strong> of <strong>${data.total}</strong> active properties`;
    }

    const grid = document.getElementById('listings-grid');
    if (!grid) return;

    if (data.results.length === 0) {
      grid.innerHTML = `<div style="grid-column:1/-1; text-align:center; padding:60px 20px; color:var(--text-muted);">No properties match the selected filter criteria.</div>`;
      return;
    }

    grid.innerHTML = data.results.map(l => createListingCard(l)).join('');
    renderFavouriteButtons();
    renderPagination(data.total, f.offset, f.limit, 'onListingsPageChange');
  } catch (e) {
    console.error('Fetch listings error:', e);
  }
}

function createListingCard(rawL) {
  const l = formatListingClient(rawL);
  const isSqM = l.is_unit_sqm;
  const areaDisplay = isSqM ? `${l.carpet_area_sqft} sqft (${l.carpet_area} m²)` : `${l.carpet_area} sqft`;
  const priceDisplay = l.price_formatted || `₹${(l.price || 0).toLocaleString()}`;
  const ppsqDisplay = l.price_per_sqft ? `₹${l.price_per_sqft.toLocaleString()}/sqft` : '';

  return `
    <div class="glass-card property-card" onclick="navigate('listing-detail', '${l.listing_id}')">
      <div class="card-image-wrap">
        <div style="color:var(--text-muted); font-size:3rem;">🏢</div>
        <div class="badge-strip">
          ${l.is_verified ? `<span class="badge badge-verified">✓ Verified</span>` : ''}
          <span class="badge badge-source">${l.website || 'Portal'}</span>
          ${isSqM ? `<span class="badge badge-sqm" title="Converted from Sq Meters to Sq Feet">📐 SqM Converted</span>` : ''}
        </div>
        <button class="favourite-btn ${state.savedListingIds.has(l.listing_id) ? 'saved' : ''}" data-id="${l.listing_id}" onclick="toggleSave('${l.listing_id}', event)">${state.savedListingIds.has(l.listing_id) ? '❤️' : '🤍'}</button>
      </div>
      <div class="card-body">
        <div class="card-price">
          ${priceDisplay}
          ${ppsqDisplay ? `<span class="card-price-per-sqft">${ppsqDisplay}</span>` : ''}
        </div>
        <h3 class="card-title">${l.apartment_name || 'Premium Property'}</h3>
        <div class="card-location">📍 ${l.locality ? l.locality.toUpperCase() : 'Bangalore'}</div>
        <div class="card-specs">
          <span class="spec-item">🛏️ ${l.bedroom || 0} BHK</span>
          <span class="spec-item">🚿 ${l.bathroom || 0} Bath</span>
          <span class="spec-item">📐 ${areaDisplay}</span>
        </div>
      </div>
    </div>
  `;
}

function onFilterChange() {
  state.listingsFilter.locality = document.getElementById('filter-locality').value;
  state.listingsFilter.bhk = document.getElementById('filter-bhk').value;
  state.listingsFilter.property_type = document.getElementById('filter-pt').value;
  state.listingsFilter.furnishing = document.getElementById('filter-furnishing').value;
  state.listingsFilter.offset = 0;
  fetchAndRenderListings();
}

function onSortChange() {
  const val = document.getElementById('filter-sort').value;
  const [sort_by, order] = val.split(':');
  state.listingsFilter.sort_by = sort_by;
  state.listingsFilter.order = order;
  state.listingsFilter.offset = 0;
  fetchAndRenderListings();
}

function onListingsPageChange(newOffset) {
  state.listingsFilter.offset = newOffset;
  fetchAndRenderListings();
  window.scrollTo({ top: 300, behavior: 'smooth' });
}

// 2. LISTING DETAIL VIEW
async function loadListingDetailView(listingId) {
  const container = document.getElementById('view-container');
  container.innerHTML = `<div style="text-align:center; padding:60px;">Loading listing details...</div>`;

  try {
    const res = await apiFetch(`/api/listings/${listingId}`);
    if (!res || !res.ok) {
      container.innerHTML = `<div style="text-align:center; padding:60px;">Listing not found. <button class="btn btn-secondary" onclick="navigate('listings')">Back</button></div>`;
      return;
    }
    const data = await res.json();
    const l = data.listing;
    const similar = data.similar || [];

    const isSqM = l.is_unit_sqm;
    const areaDisplay = isSqM ? `${l.carpet_area_sqft} sqft (${l.carpet_area} m²)` : `${l.carpet_area} sqft`;

    container.innerHTML = `
      <div style="margin-bottom:20px;">
        <button class="btn btn-secondary btn-sm" onclick="navigate('listings')">← Back to Listings</button>
      </div>

      <div class="glass-card" style="padding:28px; margin-bottom:32px;">
        <div style="display:flex; justify-content:space-between; align-items:flex-start; flex-wrap:wrap; gap:16px; margin-bottom:20px;">
          <div>
            <div style="display:flex; gap:8px; margin-bottom:8px;">
              ${l.is_verified ? `<span class="badge badge-verified">✓ Verified Property</span>` : ''}
              <span class="badge badge-source">Source: ${l.website || 'Portal'}</span>
              ${isSqM ? `<span class="badge badge-sqm">📐 Area Converted from Square Meters</span>` : ''}
            </div>
            <h1 style="font-family:var(--font-display); font-size:2rem; font-weight:700; margin-bottom:6px;">${l.apartment_name || 'Exclusive Residence'}</h1>
            <div style="color:var(--text-secondary); font-size:1.05rem;">📍 ${l.locality ? l.locality.toUpperCase() : 'Bangalore'} · Floor ${l.floor || 0} of ${l.total_floors || 0}</div>
          </div>
          <div style="text-align:right;">
            <div style="font-size:2rem; font-weight:800; color:var(--accent); font-family:var(--font-display);">${l.price_formatted}</div>
            <div style="color:var(--text-muted); font-size:0.9rem;">₹${l.price_per_sqft.toLocaleString()} / sqft</div>
            <button id="detail-save-btn" class="btn btn-primary" style="margin-top:12px;" onclick="toggleSave('${l.listing_id}', event)">
              ${state.savedListingIds.has(l.listing_id) ? '❤️ Saved to Favourites' : '🤍 Save to Favourites'}
            </button>
          </div>
        </div>

        <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(180px, 1fr)); gap:16px; padding:20px; background:rgba(0,0,0,0.25); border-radius:var(--radius-sm); margin-bottom:24px;">
          <div><span style="color:var(--text-muted); font-size:0.8rem; display:block;">BEDROOMS</span><strong>${l.bedroom || 0} BHK</strong></div>
          <div><span style="color:var(--text-muted); font-size:0.8rem; display:block;">BATHROOMS</span><strong>${l.bathroom || 0} Bath</strong></div>
          <div><span style="color:var(--text-muted); font-size:0.8rem; display:block;">CARPET AREA</span><strong>${areaDisplay}</strong></div>
          <div><span style="color:var(--text-muted); font-size:0.8rem; display:block;">SUPER BUILT-UP</span><strong>${l.super_built_up_area || 'N/A'} sqft</strong></div>
          <div><span style="color:var(--text-muted); font-size:0.8rem; display:block;">FACING</span><strong>${l.facing_direction || 'N/A'}</strong></div>
          <div><span style="color:var(--text-muted); font-size:0.8rem; display:block;">FURNISHING</span><strong>${l.furnishing || 'N/A'}</strong></div>
        </div>

        <div style="margin-bottom:24px;">
          <h3 style="margin-bottom:8px; font-size:1.15rem;">Description</h3>
          <p style="color:var(--text-secondary); line-height:1.7;">${l.description || 'No description provided.'}</p>
        </div>

        <div style="display:flex; justify-content:space-between; align-items:center; border-top:1px solid var(--border-color); padding-top:16px;">
          <div>
            <span style="color:var(--text-muted); font-size:0.85rem;">Posted by:</span>
            <strong>${l.posted_by_name || 'Agent'} (${l.posted_by || 'Portal'})</strong>
          </div>
          <div>
            <span style="color:var(--text-muted); font-size:0.85rem;">Contact:</span>
            <strong>${l.posted_by_contact || 'Verified in App'}</strong>
          </div>
        </div>
      </div>

      <!-- Comparable / Similar Properties -->
      <div style="margin-top:40px;">
        <h2 style="font-family:var(--font-display); font-size:1.4rem; font-weight:700; margin-bottom:16px;">Comparable Properties in ${l.locality ? l.locality.toUpperCase() : 'Locality'} (±15% Price)</h2>
        ${similar.length > 0 ? `
          <div class="property-grid">
            ${similar.map(s => createListingCard(s)).join('')}
          </div>
        ` : `<div style="color:var(--text-muted);">No exact comparable properties currently available.</div>`}
      </div>
    `;
    renderFavouriteButtons();
  } catch (e) {
    console.error('Error loading detail:', e);
  }
}

// 3. RENTALS VIEW
async function loadRentalsView() {
  const container = document.getElementById('view-container');
  container.innerHTML = `
    <div class="hero-section">
      <h1 class="hero-title">Rental Homes in Bangalore</h1>
      <p class="hero-subtitle">Browse monthly rentals with upfront security deposit and maintenance transparency.</p>
    </div>

    <!-- Rentals Grid -->
    <div id="rentals-grid" class="property-grid">
      <div style="grid-column:1/-1; text-align:center; padding:40px;">Loading rentals...</div>
    </div>
  `;

  try {
    const res = await apiFetch('/api/rentals?limit=24');
    if (!res || !res.ok) return;
    const data = await res.json();
    const grid = document.getElementById('rentals-grid');
    if (!grid) return;

    grid.innerHTML = data.results.map(r => `
      <div class="glass-card property-card">
        <div class="card-image-wrap">
          <div style="color:var(--text-muted); font-size:3rem;">🏡</div>
          <div class="badge-strip">
            <span class="badge badge-verified">For Rent</span>
            <span class="badge badge-source">${r.locality ? r.locality.toUpperCase() : ''}</span>
          </div>
        </div>
        <div class="card-body">
          <div class="card-price">₹${r.price.toLocaleString()}<span style="font-size:0.85rem; color:var(--text-muted);">/month</span></div>
          <h3 class="card-title">${r.title || r.apartment_name}</h3>
          <div class="card-location">📍 ${r.locality ? r.locality.toUpperCase() : 'Bangalore'}</div>
          <div style="font-size:0.85rem; color:var(--text-secondary); margin:6px 0;">
            Deposit: ₹${(r.deposit || 0).toLocaleString()} · Maint: ₹${(r.maintenance || 0).toLocaleString()}
          </div>
          <div class="card-specs">
            <span class="spec-item">🛏️ ${r.bedroom} BHK</span>
            <span class="spec-item">📐 ${r.carpet_area} sqft</span>
            <span class="spec-item">🛋️ ${r.furnishing}</span>
          </div>
        </div>
      </div>
    `).join('');
  } catch (e) {
    console.error('Rentals fetch error:', e);
  }
}

// 4. PROJECTS VIEW
async function loadProjectsView() {
  const container = document.getElementById('view-container');
  container.innerHTML = `
    <div class="hero-section">
      <h1 class="hero-title">Builder Projects & Developments</h1>
      <p class="hero-subtitle">Top residential developments in Bangalore with RERA registration and accurate pricing.</p>
    </div>

    <div id="projects-grid" class="property-grid">
      <div style="grid-column:1/-1; text-align:center; padding:40px;">Loading builder projects...</div>
    </div>
  `;

  try {
    const res = await apiFetch('/api/projects?limit=24');
    if (!res || !res.ok) return;
    const data = await res.json();
    const grid = document.getElementById('projects-grid');
    if (!grid) return;

    grid.innerHTML = data.results.map(p => `
      <div class="glass-card property-card">
        <div class="card-image-wrap">
          <div style="color:var(--text-muted); font-size:3rem;">🏗️</div>
          <div class="badge-strip">
            <span class="badge badge-verified">${p.project_status ? p.project_status.toUpperCase() : 'ACTIVE'}</span>
            <span class="badge badge-source">${p.developer_name}</span>
          </div>
        </div>
        <div class="card-body">
          <div class="card-price">${p.price_range_formatted}</div>
          <h3 class="card-title">${p.apartment_name}</h3>
          <div class="card-location">📍 ${p.locality ? p.locality.toUpperCase() : 'Bangalore'}</div>
          <div style="font-size:0.82rem; color:var(--text-muted); margin:4px 0;">
            RERA: ${p.rera_number || 'Registered'}
          </div>
          <div class="card-specs">
            <span class="spec-item">🏢 ${p.total_units || 0} Units</span>
            <span class="spec-item">🗼 ${p.total_towers || 0} Towers</span>
            <span class="spec-item">📋 ${p.actual_total_listings} Listings</span>
          </div>
        </div>
      </div>
    `).join('');
  } catch (e) {
    console.error('Projects fetch error:', e);
  }
}

// 5. SAVED / FAVOURITES VIEW
async function loadSavedView() {
  const container = document.getElementById('view-container');
  if (!state.user) {
    container.innerHTML = `
      <div style="text-align:center; padding:80px 20px;">
        <h2 style="font-size:1.8rem; margin-bottom:12px;">Login Required</h2>
        <p style="color:var(--text-secondary); margin-bottom:24px;">Please login with a demo account to view your saved properties.</p>
        <button class="btn btn-primary" onclick="openLoginModal()">Login with Demo User</button>
      </div>
    `;
    return;
  }

  container.innerHTML = `
    <div class="hero-section">
      <h1 class="hero-title">Your Saved Properties</h1>
      <p class="hero-subtitle">Properties saved on account: <strong>${state.user.email}</strong></p>
    </div>

    <div id="saved-grid" class="property-grid">
      <div style="grid-column:1/-1; text-align:center; padding:40px;">Loading saved properties...</div>
    </div>
  `;

  try {
    const res = await apiFetch('/api/saved');
    if (!res || !res.ok) return;
    const data = await res.json();
    const grid = document.getElementById('saved-grid');
    if (!grid) return;

    if (!data.results || data.results.length === 0) {
      grid.innerHTML = `<div style="grid-column:1/-1; text-align:center; padding:60px 20px; color:var(--text-muted);">No saved properties yet. Browse listings and click the heart icon to save!</div>`;
      return;
    }

    grid.innerHTML = data.results.map(l => createListingCard(formatListingClient(l))).join('');
    renderFavouriteButtons();
  } catch (e) {
    console.error('Saved fetch error:', e);
  }
}

// 6. INSIGHTS VIEW
async function loadInsightsView() {
  const container = document.getElementById('view-container');
  container.innerHTML = `<div style="text-align:center; padding:60px;">Computing real-time insights...</div>`;

  try {
    const res = await apiFetch('/api/insights/summary');
    if (!res || !res.ok) return;
    const data = await res.json();

    container.innerHTML = `
      <div class="hero-section">
        <h1 class="hero-title">Real Estate Market Insights</h1>
        <p class="hero-subtitle">Aggregated metrics, locality price distributions, and data quality intelligence.</p>
      </div>

      <!-- Stats Strip -->
      <div class="stats-strip">
        <div class="glass-card stat-box">
          <span class="stat-label">Total Listings</span>
          <span class="stat-value">${data.total_listings.toLocaleString()}</span>
        </div>
        <div class="glass-card stat-box">
          <span class="stat-label">Active Live Listings</span>
          <span class="stat-value" style="color:var(--accent);">${data.active_listings.toLocaleString()}</span>
        </div>
        <div class="glass-card stat-box">
          <span class="stat-label">Total Rentals</span>
          <span class="stat-value">${data.total_rentals.toLocaleString()}</span>
        </div>
        <div class="glass-card stat-box">
          <span class="stat-label">Builder Projects</span>
          <span class="stat-value">${data.total_projects.toLocaleString()}</span>
        </div>
        <div class="glass-card stat-box">
          <span class="stat-label">Discrepancies Proven</span>
          <span class="stat-value" style="color:var(--warning);">${data.findings_count}</span>
        </div>
      </div>

      <!-- Locality Table & BHK Breakdown -->
      <div class="insights-grid">
        <div class="glass-card" style="padding:24px;">
          <h3 style="font-family:var(--font-display); font-size:1.25rem; font-weight:700; margin-bottom:16px;">Locality Median Price Benchmark</h3>
          <div class="table-responsive">
            <table class="custom-table">
              <thead>
                <tr>
                  <th>Locality</th>
                  <th>Listings</th>
                  <th>Median Price</th>
                  <th>Avg Price</th>
                </tr>
              </thead>
              <tbody>
                ${data.locality_breakdown.map(loc => `
                  <tr>
                    <td><strong>${loc.locality}</strong></td>
                    <td>${loc.count}</td>
                    <td style="color:var(--accent); font-weight:600;">${loc.median_price_formatted}</td>
                    <td>${loc.avg_price_formatted}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        </div>

        <div class="glass-card" style="padding:24px;">
          <h3 style="font-family:var(--font-display); font-size:1.25rem; font-weight:700; margin-bottom:16px;">BHK Inventory Distribution</h3>
          <div style="display:flex; flex-direction:column; gap:14px; margin-top:20px;">
            ${data.bhk_distribution.map(b => {
              const pct = ((b.count / data.active_listings) * 100).toFixed(1);
              return `
                <div>
                  <div style="display:flex; justify-content:space-between; font-size:0.9rem; margin-bottom:4px;">
                    <span>${b.bhk}</span>
                    <span><strong>${b.count}</strong> (${pct}%)</span>
                  </div>
                  <div style="height:8px; background:rgba(255,255,255,0.08); border-radius:4px; overflow:hidden;">
                    <div style="width:${pct}%; height:100%; background:linear-gradient(90deg, var(--accent), var(--accent-indigo));"></div>
                  </div>
                </div>
              `;
            }).join('')}
          </div>
        </div>
      </div>
    `;
  } catch (e) {
    console.error('Insights fetch error:', e);
  }
}

// 7. FINDINGS EXPLORER VIEW
async function loadFindingsView() {
  const container = document.getElementById('view-container');
  container.innerHTML = `<div style="text-align:center; padding:60px;">Loading API documentation findings...</div>`;

  try {
    const res = await apiFetch('/api/submission');
    if (!res || !res.ok) return;
    const sub = await res.json();
    const findings = sub.findings || [];

    container.innerHTML = `
      <div class="hero-section">
        <h1 class="hero-title">Documentation Lie Detection Findings</h1>
        <p class="hero-subtitle">Systematic audit comparing <code>API_REFERENCE.md</code> against real running API behavior (15 verified discrepancies).</p>
      </div>

      <div style="display:flex; flex-direction:column; gap:16px;">
        ${findings.map((f, i) => `
          <div class="glass-card finding-card ${f.category === 'data_quality' || f.category === 'fraud' ? 'danger' : f.category === 'units' || f.category === 'missing_endpoint' ? 'warning' : 'info'}">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
              <div>
                <span class="badge badge-source" style="margin-right:8px;">#${i+1} ${f.category.toUpperCase()}</span>
                <strong style="font-family:monospace; font-size:0.95rem; color:var(--text-primary);">${f.endpoint}</strong>
              </div>
            </div>
            <div style="display:grid; grid-template-columns:1fr 1fr; gap:16px; margin:12px 0; font-size:0.9rem;">
              <div style="background:rgba(239,68,68,0.08); padding:12px; border-radius:6px; border:1px solid rgba(239,68,68,0.2);">
                <span style="color:var(--danger); font-size:0.75rem; font-weight:700; display:block;">DOCUMENTED</span>
                ${f.documented}
              </div>
              <div style="background:rgba(16,185,129,0.08); padding:12px; border-radius:6px; border:1px solid rgba(16,185,129,0.2);">
                <span style="color:var(--accent); font-size:0.75rem; font-weight:700; display:block;">ACTUAL RUNNING API</span>
                ${f.actual}
              </div>
            </div>
            <div style="font-size:0.85rem; color:var(--text-secondary); margin-top:8px;">
              <strong>How Found:</strong> ${f.how_found}<br>
              <strong>Impact:</strong> ${f.impact}
            </div>
            ${f.evidence && f.evidence.length > 0 ? `
              <div style="margin-top:10px; font-size:0.8rem; color:var(--text-muted);">
                <strong>Evidence (${f.evidence.length} IDs):</strong> <code>${f.evidence.join(', ')}</code>
              </div>
            ` : ''}
          </div>
        `).join('')}
      </div>
    `;
  } catch (e) {
    console.error('Findings fetch error:', e);
  }
}

// 8. 10 ANSWERS VIEW
async function loadAnswersView() {
  const container = document.getElementById('view-container');
  container.innerHTML = `<div style="text-align:center; padding:60px;">Loading assignment answers...</div>`;

  try {
    const res = await apiFetch('/api/submission');
    if (!res || !res.ok) return;
    const sub = await res.json();
    const a = sub.answers;

    container.innerHTML = `
      <div class="hero-section">
        <h1 class="hero-title">Assignment 10 Questions & Solutions</h1>
        <p class="hero-subtitle">Mathematical derivations and rigorous data analysis anchored to <code>2026-09-10T00:00:00+05:30</code> (IST).</p>
      </div>

      <div class="insights-grid">
        <div class="glass-card" style="padding:22px;">
          <span class="stat-label">Q1: Total Listing Records</span>
          <div class="stat-value" style="color:var(--accent);">${a.total_listing_records.toLocaleString()}</div>
          <p style="color:var(--text-secondary); font-size:0.85rem; margin-top:6px;">Exhaustive offset pagination through /v1/listings to the end (ignoring incorrect total).</p>
        </div>

        <div class="glass-card" style="padding:22px;">
          <span class="stat-label">Q2: Unique Physical Properties</span>
          <div class="stat-value" style="color:var(--accent);">${a.unique_properties.toLocaleString()}</div>
          <p style="color:var(--text-secondary); font-size:0.85rem; margin-top:6px;">Clustered across physical attributes (apt, floor, bhk, bath, facing, normalized carpet).</p>
        </div>

        <div class="glass-card" style="padding:22px;">
          <span class="stat-label">Q3: Active Live Listings</span>
          <div class="stat-value" style="color:var(--accent);">${a.active_listings.toLocaleString()}</div>
          <p style="color:var(--text-secondary); font-size:0.85rem; margin-top:6px;">Retrievable records having is_live == true (excludes 978 inactive listings).</p>
        </div>

        <div class="glass-card" style="padding:22px;">
          <span class="stat-label">Q4: Corrupt Listings</span>
          <div class="stat-value" style="color:var(--danger);">${a.corrupt_listing_ids.length}</div>
          <p style="color:var(--text-secondary); font-size:0.85rem; margin-top:6px;">Physically impossible values (negative prices, floor > total, carpet > sbua, swapped coordinates).</p>
        </div>

        <div class="glass-card" style="padding:22px;">
          <span class="stat-label">Q5: Total Monthly Rent (Yelahanka)</span>
          <div class="stat-value" style="color:var(--accent);">₹${a.total_monthly_rent.toLocaleString()}</div>
          <p style="color:var(--text-secondary); font-size:0.85rem; margin-top:6px;">Sum of monthly rent across all 162 retrievable rentals in Yelahanka.</p>
        </div>

        <div class="glass-card" style="padding:22px;">
          <span class="stat-label">Q6: Avg Price/SqFt (2BHK Active)</span>
          <div class="stat-value" style="color:var(--accent);">₹${a.avg_price_per_sqft_2bhk.toLocaleString()} / sqft</div>
          <p style="color:var(--text-secondary); font-size:0.85rem; margin-top:6px;">Mean price / carpet area for live 2BHKs excluding Q4 & Q9, with SqM to SqFt conversion.</p>
        </div>

        <div class="glass-card" style="padding:22px;">
          <span class="stat-label">Q7: Costliest Project</span>
          <div class="stat-value" style="color:var(--accent); font-size:1.3rem;">${a.costliest_project.project_id} (₹${(a.costliest_project.price_max_inr).toLocaleString()})</div>
          <p style="color:var(--text-secondary); font-size:0.85rem; margin-top:6px;">Puravankara Sanctuary (P10068) with price_max 99.8 Cr = ₹99,80,00,000.</p>
        </div>

        <div class="glass-card" style="padding:22px;">
          <span class="stat-label">Q8: Listings in Last 7 Days</span>
          <div class="stat-value" style="color:var(--accent);">${a.listings_last_7_days}</div>
          <p style="color:var(--text-secondary); font-size:0.85rem; margin-top:6px;">Posted in [2026-09-03T00:00:00+05:30, 2026-09-10T00:00:00+05:30) in IST.</p>
        </div>

        <div class="glass-card" style="padding:22px;">
          <span class="stat-label">Q9: Fake Bait Listings</span>
          <div class="stat-value" style="color:var(--danger);">${a.fake_listing_ids.length}</div>
          <p style="color:var(--text-secondary); font-size:0.85rem; margin-top:6px;">8 rental-priced bait sales (< 100k) + 92 advance fee booking scam listings.</p>
        </div>

        <div class="glass-card" style="padding:22px;">
          <span class="stat-label">Q10: Projects with Wrong Count</span>
          <div class="stat-value" style="color:var(--warning);">${a.projects_with_wrong_listing_count} / 520</div>
          <p style="color:var(--text-secondary); font-size:0.85rem; margin-top:6px;">Projects whose project.total_listings disagrees with actual listings in /v1/listings.</p>
        </div>
      </div>
    `;
  } catch (e) {
    console.error('Answers fetch error:', e);
  }
}

// Pagination Helper
function renderPagination(total, offset, limit, callbackName) {
  const container = document.getElementById('pagination-container');
  if (!container) return;

  const totalPages = Math.ceil(total / limit);
  const currentPage = Math.floor(offset / limit) + 1;

  if (totalPages <= 1) {
    container.innerHTML = '';
    return;
  }

  container.innerHTML = `
    <button class="btn btn-secondary btn-sm" ${currentPage === 1 ? 'disabled' : ''} onclick="${callbackName}(${(currentPage - 2) * limit})">← Previous</button>
    <span style="color:var(--text-secondary); font-size:0.9rem;">Page <strong>${currentPage}</strong> of <strong>${totalPages}</strong></span>
    <button class="btn btn-secondary btn-sm" ${currentPage === totalPages ? 'disabled' : ''} onclick="${callbackName}(${currentPage * limit})">Next →</button>
  `;
}

// Login Modal
function openLoginModal() {
  const modal = document.getElementById('login-modal');
  if (modal) modal.style.display = 'flex';
}

function closeLoginModal() {
  const modal = document.getElementById('login-modal');
  if (modal) modal.style.display = 'none';
}

function fillDemo(email) {
  document.getElementById('login-email').value = email;
  document.getElementById('login-password').value = '5edd65b804';
}

async function submitLogin(e) {
  if (e) e.preventDefault();
  const email = document.getElementById('login-email').value;
  const password = document.getElementById('login-password').value;
  const errEl = document.getElementById('login-error');
  errEl.innerText = '';

  try {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });

    if (!res.ok) {
      const err = await res.json();
      errEl.innerText = err.detail || 'Login failed';
      return;
    }

    const data = await res.json();
    setSession(data);
    await fetchSavedIds();
    closeLoginModal();
    renderView();
  } catch (err) {
    errEl.innerText = 'Network error during login';
  }
}

// Init
window.addEventListener('DOMContentLoaded', () => {
  updateAuthUI();
  fetchSavedIds();
  window.addEventListener('hashchange', handleHashChange);
  handleHashChange();
});
