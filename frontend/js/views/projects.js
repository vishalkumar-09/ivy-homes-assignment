// ═══════════════════════════════════════════════════════
//  Ivy Homes — Builder Projects View Module
// ═══════════════════════════════════════════════════════

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
