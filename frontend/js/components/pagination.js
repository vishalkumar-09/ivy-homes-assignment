// ═══════════════════════════════════════════════════════
//  Ivy Homes — Generic Pagination Component
// ═══════════════════════════════════════════════════════

function renderPaginationIn(containerId, total, offset, limit, callbackName) {
  const container = document.getElementById(containerId);
  if (!container) return;

  const totalPages  = Math.ceil(total / limit);
  const currentPage = Math.floor(offset / limit) + 1;

  if (totalPages <= 1) {
    container.innerHTML = '';
    return;
  }

  const pages = [];
  for (let p = Math.max(1, currentPage - 2); p <= Math.min(totalPages, currentPage + 2); p++) {
    pages.push(p);
  }

  container.innerHTML = `
    <button class="page-btn" ${currentPage === 1 ? 'disabled' : ''} onclick="${callbackName}(0)">«</button>
    <button class="page-btn" ${currentPage === 1 ? 'disabled' : ''} onclick="${callbackName}(${(currentPage - 2) * limit})">‹</button>
    ${currentPage > 3 ? `<button class="page-btn" onclick="${callbackName}(0)">1</button><span style="color:var(--text-muted);align-self:center;">…</span>` : ''}
    ${pages.map(p => `<button class="page-btn ${p === currentPage ? 'active' : ''}" onclick="${callbackName}(${(p - 1) * limit})">${p}</button>`).join('')}
    ${currentPage < totalPages - 2 ? `<span style="color:var(--text-muted);align-self:center;">…</span><button class="page-btn" onclick="${callbackName}(${(totalPages - 1) * limit})">${totalPages}</button>` : ''}
    <button class="page-btn" ${currentPage === totalPages ? 'disabled' : ''} onclick="${callbackName}(${currentPage * limit})">›</button>
    <button class="page-btn" ${currentPage === totalPages ? 'disabled' : ''} onclick="${callbackName}(${(totalPages - 1) * limit})">»</button>
    <span style="color:var(--text-muted);font-size:0.82rem;align-self:center;">Page ${currentPage} / ${totalPages} &nbsp;·&nbsp; ${total.toLocaleString()} results</span>`;
}

// Backward-compatible alias for Listings view (uses fixed #pagination-container)
function renderPagination(total, offset, limit, callbackName) {
  renderPaginationIn('pagination-container', total, offset, limit, callbackName);
}
