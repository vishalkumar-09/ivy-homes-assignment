'use client';

export default function Pagination({ total, offset, limit, onPageChange }) {
  const totalPages  = Math.ceil(total / limit);
  const currentPage = Math.floor(offset / limit) + 1;

  if (totalPages <= 1) return null;

  const pages = [];
  for (let p = Math.max(1, currentPage - 2); p <= Math.min(totalPages, currentPage + 2); p++) {
    pages.push(p);
  }

  return (
    <div className="pagination-controls">
      <button className="page-btn" disabled={currentPage === 1} onClick={() => onPageChange(0)}>«</button>
      <button className="page-btn" disabled={currentPage === 1} onClick={() => onPageChange((currentPage - 2) * limit)}>‹</button>

      {currentPage > 3 && (
        <>
          <button className="page-btn" onClick={() => onPageChange(0)}>1</button>
          <span style={{ color: 'var(--text-muted)', alignSelf: 'center' }}>…</span>
        </>
      )}

      {pages.map(p => (
        <button
          key={p}
          className={`page-btn${p === currentPage ? ' active' : ''}`}
          onClick={() => onPageChange((p - 1) * limit)}
        >{p}</button>
      ))}

      {currentPage < totalPages - 2 && (
        <>
          <span style={{ color: 'var(--text-muted)', alignSelf: 'center' }}>…</span>
          <button className="page-btn" onClick={() => onPageChange((totalPages - 1) * limit)}>{totalPages}</button>
        </>
      )}

      <button className="page-btn" disabled={currentPage === totalPages} onClick={() => onPageChange(currentPage * limit)}>›</button>
      <button className="page-btn" disabled={currentPage === totalPages} onClick={() => onPageChange((totalPages - 1) * limit)}>»</button>
      <span style={{ color: 'var(--text-muted)', fontSize: '0.82rem', alignSelf: 'center' }}>
        Page {currentPage} / {totalPages} &nbsp;·&nbsp; {total.toLocaleString()} results
      </span>
    </div>
  );
}
