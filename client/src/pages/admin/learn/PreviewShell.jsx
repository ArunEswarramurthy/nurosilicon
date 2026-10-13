import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { Eye, X, ChevronLeft, ChevronRight } from 'lucide-react';

/**
 * PreviewShell wraps student pages when viewed from the admin preview route.
 * It shows a top banner so the admin knows they are in preview mode,
 * and renders children (the actual student component) below it.
 */
export default function PreviewShell({ children, slug, lessonId }) {
  const navigate = useNavigate();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', fontFamily: 'Inter, sans-serif' }}>

      {/* Preview banner */}
      <div style={{
        position: 'sticky', top: 0, zIndex: 200,
        background: 'linear-gradient(90deg, #7c3aed, #00A6FF)',
        padding: '0 16px',
        height: 40,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        flexShrink: 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <Eye size={14} color="#fff" />
            <span style={{ fontSize: 12, fontWeight: 700, color: '#fff', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
              Admin Preview
            </span>
          </div>
          <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.65)' }}>
            — This is how students see this {lessonId ? 'lesson' : 'course'}
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {lessonId ? (
            <button
              onClick={() => navigate(`/admin/learn/preview/${slug}`)}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 5, height: 26, padding: '0 10px', borderRadius: 6, background: 'rgba(255,255,255,0.15)', color: '#fff', border: '1px solid rgba(255,255,255,0.25)', cursor: 'pointer', fontSize: 11, fontWeight: 600 }}
            >
              <ChevronLeft size={11} /> Course Overview
            </button>
          ) : null}
          <button
            onClick={() => navigate(-1)}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 5, height: 26, padding: '0 10px', borderRadius: 6, background: 'rgba(255,255,255,0.15)', color: '#fff', border: '1px solid rgba(255,255,255,0.25)', cursor: 'pointer', fontSize: 11, fontWeight: 600 }}
          >
            <X size={11} /> Exit Preview
          </button>
        </div>
      </div>

      {/* Student component rendered below the banner */}
      <div style={{ flex: 1, background: '#f1f4f9' }}>
        {children}
      </div>
    </div>
  );
}
