// ═══════════════════════════════════════════════════════
//  Ivy Homes — SPA Router Module
// ═══════════════════════════════════════════════════════

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
  state.currentRoute     = parts[0];
  state.currentListingId = parts[1] || null;
  document.querySelectorAll('.nav-item').forEach(el =>
    el.classList.toggle('active', el.dataset.route === parts[0])
  );
  renderView();
}

function renderView() {
  const container = document.getElementById('view-container');
  if (!container) return;
  switch (state.currentRoute) {
    case 'listings':       loadListingsView();                             break;
    case 'listing-detail': loadListingDetailView(state.currentListingId); break;
    case 'rentals':        loadRentalsView();                              break;
    case 'projects':       loadProjectsView();                             break;
    case 'saved':          loadSavedView();                                break;
    case 'insights':       loadInsightsView();                             break;
    case 'findings':       loadFindingsView();                             break;
    case 'answers':        loadAnswersView();                              break;
    default:               loadListingsView();
  }
}
