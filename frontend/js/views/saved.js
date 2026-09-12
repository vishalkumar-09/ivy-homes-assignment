// ═══════════════════════════════════════════════════════
//  Ivy Homes — Saved / Favourites View & Actions Module
// ═══════════════════════════════════════════════════════

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
