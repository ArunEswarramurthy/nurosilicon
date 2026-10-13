// Live preview of a template config using sample content
export default function TemplatePreview({ config }) {
  if (!config) return null;
  const c = config.colors || {};
  const t = config.typography || {};
  const l = config.layout || {};
  const d = config.dimensions || {};
  const si = config.studentIdentity || {};
  const comps = config.components || {};

  const sidebarWidth = l.sidebarWidth || 280;
  const hasSidebar = l.sidebar !== 'none' && comps.curriculumSidebar !== false;
  const isRight = l.sidebar === 'right';

  const headerStyle = {
    height: d.headerHeight || 56,
    background: c.headerBg || '#0a0a1a',
    display: 'flex', alignItems: 'center',
    padding: '0 20px',
    gap: 12,
    borderRadius: `${d.cardRadius || 12}px ${d.cardRadius || 12}px 0 0`,
  };

  const contentStyle = {
    background: c.contentBg || '#fff',
    padding: d.contentPadding || 32,
    flex: 1,
    minWidth: 0,
    fontFamily: t.fontFamily || 'Inter',
    fontSize: t.bodySize || 14,
    lineHeight: t.lineHeight || 1.6,
    color: c.bodyColor || '#374151',
    textAlign: t.textAlign || 'left',
  };

  const sidebarStyle = {
    width: sidebarWidth,
    background: c.sidebarBg || '#f1f4f9',
    padding: 16,
    flexShrink: 0,
    borderRight: isRight ? 'none' : `${d.borderThickness || 1.5}px solid ${c.borderColor || '#e2e8f0'}`,
    borderLeft: isRight ? `${d.borderThickness || 1.5}px solid ${c.borderColor || '#e2e8f0'}` : 'none',
  };

  return (
    <div style={{ border: `${d.borderThickness || 1.5}px solid ${c.borderColor || '#e2e8f0'}`, borderRadius: d.cardRadius || 12, overflow: 'hidden', boxShadow: '0 4px 20px rgba(0,0,0,0.08)', background: c.pageBg || '#f8fafc' }}>
      {/* Header */}
      <div style={headerStyle}>
        <div style={{ width: 24, height: 24, borderRadius: 6, background: c.primary || '#00A6FF', flexShrink: 0 }} />
        <span style={{ fontSize: 13, fontWeight: 700, color: '#fff', flex: 1 }}>NuroSilicon Learn</span>
        {comps.studentIdentity !== false && si.showName !== false && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            {si.showAvatar !== false && <div style={{ width: 24, height: 24, borderRadius: '50%', background: c.primary || '#00A6FF', flexShrink: 0 }} />}
            <span style={{ fontSize: si.fontSize || 13, fontWeight: si.fontWeight || 600, color: '#fff' }}>Student Name</span>
          </div>
        )}
      </div>

      {/* Body */}
      <div style={{ display: 'flex', flexDirection: isRight ? 'row' : 'row', minHeight: 320 }}>
        {/* Left sidebar */}
        {hasSidebar && !isRight && (
          <div style={sidebarStyle}>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>Curriculum</div>
            {['Module 1', 'Module 2'].map((m, mi) => (
              <div key={m} style={{ marginBottom: 8 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: c.headingColor || '#0a0a1a', marginBottom: 4 }}>{m}</div>
                {['Lesson 1', 'Lesson 2', 'Lesson 3'].map((ls, li) => (
                  <div key={ls} style={{ padding: '4px 8px', borderRadius: 5, fontSize: 11, color: mi === 0 && li === 0 ? c.primary || '#00A6FF' : '#64748b', background: mi === 0 && li === 0 ? `${c.primary || '#00A6FF'}15` : 'transparent', marginBottom: 2 }}>{ls}</div>
                ))}
              </div>
            ))}
          </div>
        )}

        {/* Main content */}
        <div style={contentStyle}>
          {comps.lessonTitle !== false && (
            <h2 style={{ fontSize: t.headingSize || 24, fontWeight: 700, color: c.headingColor || '#0a0a1a', marginBottom: 12, marginTop: 0 }}>
              Introduction to Verilog
            </h2>
          )}
          {comps.courseProgress !== false && (
            <div style={{ marginBottom: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#94a3b8', marginBottom: 4 }}>
                <span>Progress</span><span>40%</span>
              </div>
              <div style={{ height: 5, borderRadius: 99, background: '#e8ecf4', overflow: 'hidden' }}>
                <div style={{ width: '40%', height: '100%', background: c.progressColor || c.primary || '#00A6FF', borderRadius: 99 }} />
              </div>
            </div>
          )}
          {comps.richContent !== false && (
            <>
              <p style={{ marginBottom: 12, fontSize: t.bodySize || 14, color: c.bodyColor || '#374151' }}>
                Verilog is a hardware description language (HDL) used to model electronic systems. It is most commonly used in the design and verification of digital circuits.
              </p>
              {comps.codeBlocks !== false && (
                <div style={{ background: '#0d0d1a', borderRadius: 8, padding: 14, marginBottom: 12, fontFamily: 'JetBrains Mono, monospace', fontSize: 12, color: '#e2e8f0', overflowX: 'auto' }}>
                  <span style={{ color: '#00A6FF' }}>module</span> <span style={{ color: '#10B981' }}>and_gate</span>(input a, b, output y);<br />
                  &nbsp;&nbsp;<span style={{ color: '#A020F0' }}>assign</span> y = a & b;<br />
                  <span style={{ color: '#00A6FF' }}>endmodule</span>
                </div>
              )}
            </>
          )}
          {comps.prevNextButtons !== false && (
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 20, paddingTop: 16, borderTop: `1px solid ${c.borderColor || '#e2e8f0'}` }}>
              <button style={{ height: 32, padding: '0 14px', borderRadius: 7, border: `1.5px solid ${c.borderColor || '#e2e8f0'}`, background: '#fff', fontSize: 12, cursor: 'default', color: '#64748b' }}>← Previous</button>
              {comps.markCompleted !== false && (
                <button style={{ height: 32, padding: '0 14px', borderRadius: 7, border: 'none', background: c.primary || '#00A6FF', color: '#fff', fontSize: 12, cursor: 'default', fontWeight: 600 }}>Mark Complete ✓</button>
              )}
              <button style={{ height: 32, padding: '0 14px', borderRadius: 7, border: 'none', background: c.buttonBg || c.primary || '#00A6FF', color: c.buttonText || '#fff', fontSize: 12, cursor: 'default', fontWeight: 600 }}>Next →</button>
            </div>
          )}
        </div>

        {/* Right sidebar */}
        {hasSidebar && isRight && (
          <div style={sidebarStyle}>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>Curriculum</div>
            {['Module 1', 'Module 2'].map((m, mi) => (
              <div key={m} style={{ marginBottom: 8 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: c.headingColor || '#0a0a1a', marginBottom: 4 }}>{m}</div>
                {['Lesson 1', 'Lesson 2'].map((ls, li) => (
                  <div key={ls} style={{ padding: '4px 8px', borderRadius: 5, fontSize: 11, color: mi === 0 && li === 0 ? c.primary || '#00A6FF' : '#64748b', background: mi === 0 && li === 0 ? `${c.primary || '#00A6FF'}15` : 'transparent', marginBottom: 2 }}>{ls}</div>
                ))}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
