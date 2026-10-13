import { ChevronLeft, ChevronRight } from 'lucide-react';

export default function Pagination({ page, total, pageSize = 20, onChange }) {
  const totalPages = Math.ceil(total / pageSize);
  if (totalPages <= 1) return null;

  const pages = [];
  const delta = 2;
  for (let i = 1; i <= totalPages; i++) {
    if (i === 1 || i === totalPages || (i >= page - delta && i <= page + delta)) {
      pages.push(i);
    } else if (pages[pages.length - 1] !== '...') {
      pages.push('...');
    }
  }

  return (
    <div className="pagination">
      <button
        className="page-btn"
        onClick={() => onChange(page - 1)}
        disabled={page <= 1}
        aria-label="Previous page"
      >
        <ChevronLeft size={14} />
      </button>

      {pages.map((p, i) =>
        p === '...' ? (
          <span key={`ellipsis-${i}`} style={{ padding: '0 4px', color: 'var(--text-muted)', fontSize: 13 }}>...</span>
        ) : (
          <button
            key={p}
            className={`page-btn ${p === page ? 'page-btn-active' : ''}`}
            onClick={() => onChange(p)}
          >
            {p}
          </button>
        )
      )}

      <button
        className="page-btn"
        onClick={() => onChange(page + 1)}
        disabled={page >= totalPages}
        aria-label="Next page"
      >
        <ChevronRight size={14} />
      </button>
    </div>
  );
}
