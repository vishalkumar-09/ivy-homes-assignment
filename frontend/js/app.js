// ═══════════════════════════════════════════════════════
//  Ivy Homes — Application Entrypoint & Orchestrator
//  Author: Vishal Kumar Gaud · Sep 2026
// ═══════════════════════════════════════════════════════

// Explicit global exports for window scope access (inline event handlers & tests)
window.formatListingClient     = formatListingClient;
window.fmtINR                  = fmtINR;
window.apiFetch                = apiFetch;
window.setSession              = setSession;
window.logout                  = logout;
window.updateAuthUI            = updateAuthUI;
window.openLoginModal          = openLoginModal;
window.closeLoginModal         = closeLoginModal;
window.fillDemo                = fillDemo;
window.submitLogin             = submitLogin;
window.initTheme               = initTheme;
window.setTheme                = setTheme;
window.toggleTheme             = toggleTheme;
window.onScroll                = onScroll;
window.skeletonCards           = skeletonCards;
window.createListingCard       = createListingCard;
window.renderPaginationIn      = renderPaginationIn;
window.renderPagination        = renderPagination;
window.navigate                = navigate;
window.handleHashChange        = handleHashChange;
window.renderView              = renderView;
window.loadListingsView        = loadListingsView;
window.fetchAndRenderListings  = fetchAndRenderListings;
window.onFilterChange          = onFilterChange;
window.resetFilters            = resetFilters;
window.updateResetBtn          = updateResetBtn;
window.onSortChange            = onSortChange;
window.onListingsPageChange    = onListingsPageChange;
window.loadListingDetailView   = loadListingDetailView;
window.loadRentalsView         = loadRentalsView;
window.fetchAndRenderRentals   = fetchAndRenderRentals;
window.onRentalsFilterChange   = onRentalsFilterChange;
window.onRentalsSortChange     = onRentalsSortChange;
window.resetRentalsFilters     = resetRentalsFilters;
window.updateRentalsResetBtn   = updateRentalsResetBtn;
window.onRentalsPageChange     = onRentalsPageChange;
window.loadProjectsView        = loadProjectsView;
window.fetchAndRenderProjects  = fetchAndRenderProjects;
window.onProjectsFilterChange  = onProjectsFilterChange;
window.onProjectsSortChange    = onProjectsSortChange;
window.resetProjectsFilters    = resetProjectsFilters;
window.updateProjectsResetBtn  = updateProjectsResetBtn;
window.onProjectsPageChange    = onProjectsPageChange;
window.fetchSavedIds           = fetchSavedIds;
window.toggleSave              = toggleSave;
window.renderFavouriteButtons  = renderFavouriteButtons;
window.loadSavedView           = loadSavedView;
window.loadInsightsView        = loadInsightsView;
window.loadFindingsView        = loadFindingsView;
window.loadAnswersView         = loadAnswersView;

// ── Application Bootstrapping ──
window.addEventListener('DOMContentLoaded', () => {
  initTheme();
  updateAuthUI();
  fetchSavedIds();
  window.addEventListener('hashchange', handleHashChange);
  window.addEventListener('scroll', onScroll, { passive: true });
  handleHashChange();
});
