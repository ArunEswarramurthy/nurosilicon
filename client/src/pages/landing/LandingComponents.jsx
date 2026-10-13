import { useState } from 'react';
import nuroLogo from '/SilicpnLogo.jpeg';
import './LandingPage.css';

/* ── Circuit SVG ── */
function CircuitDeco({ style }) {
  return (
    <svg
      aria-hidden="true"
      style={{ position: 'absolute', pointerEvents: 'none', ...style }}
      width="220" height="180" viewBox="0 0 220 180" fill="none"
    >
      <circle cx="12" cy="12" r="5" stroke="#A855F7" strokeWidth="1.5" fill="none" opacity="0.4"/>
      <circle cx="12" cy="12" r="2" fill="#A855F7" opacity="0.5"/>
      <line x1="17" y1="12" x2="80" y2="12" stroke="#A855F7" strokeWidth="1" opacity="0.25"/>
      <line x1="80" y1="12" x2="80" y2="60" stroke="#A855F7" strokeWidth="1" opacity="0.25"/>
      <circle cx="80" cy="60" r="4" stroke="#9333EA" strokeWidth="1.5" fill="none" opacity="0.4"/>
      <circle cx="80" cy="60" r="1.5" fill="#9333EA" opacity="0.5"/>
      <line x1="84" y1="60" x2="160" y2="60" stroke="#9333EA" strokeWidth="1" opacity="0.2"/>
      <line x1="160" y1="60" x2="160" y2="120" stroke="#00A6FF" strokeWidth="1" opacity="0.2"/>
      <circle cx="160" cy="120" r="5" stroke="#00A6FF" strokeWidth="1.5" fill="none" opacity="0.4"/>
      <circle cx="160" cy="120" r="2" fill="#00A6FF" opacity="0.5"/>
      <line x1="165" y1="120" x2="210" y2="120" stroke="#00A6FF" strokeWidth="1" opacity="0.2"/>
      <circle cx="210" cy="120" r="3" stroke="#00E5FF" strokeWidth="1.5" fill="none" opacity="0.35"/>
      <rect x="40" y="30" width="16" height="8" rx="2" stroke="#A855F7" strokeWidth="1" opacity="0.2" fill="none"/>
      <rect x="110" y="80" width="20" height="8" rx="2" stroke="#00A6FF" strokeWidth="1" opacity="0.2" fill="none"/>
    </svg>
  );
}

/* ── Waveform row ── */
function WaveformRow({ label, color, pattern }) {
  const paths = {
    clk:    'M0,12 L8,12 L8,2 L16,2 L16,12 L24,12 L24,2 L32,2 L32,12 L40,12 L40,2 L48,2 L48,12 L56,12 L56,2 L64,2 L64,12 L72,12 L72,2 L80,2 L80,12 L88,12 L88,2 L96,2 L96,12 L104,12 L104,2 L112,2 L112,12 L120,12',
    rst:    'M0,2 L20,2 L20,12 L120,12',
    light1: 'M0,12 L24,12 L24,2 L48,2 L48,12 L72,12 L72,2 L96,2 L96,12 L120,12',
    light0: 'M0,2 L12,2 L12,12 L36,12 L36,2 L60,2 L60,12 L84,12 L84,2 L108,2 L108,12 L120,12',
  };
  return (
    <div className="lp-wave-row">
      <div className="lp-wave-label">{label}</div>
      <div className="lp-wave-track">
        <svg className="lp-wave-svg" viewBox="0 0 120 14" preserveAspectRatio="none">
          <path d={paths[pattern] || paths.clk} stroke={color} strokeWidth="1.5" fill="none"/>
        </svg>
      </div>
    </div>
  );
}

/* ── Sidebar icon using SVG paths instead of emoji ── */
function SidebarIcon({ active, children }) {
  return (
    <div className={`lp-ide-sidebar-icon${active ? ' active' : ''}`}>
      {children}
    </div>
  );
}

/* ── IDE Mockup ── */
function IDEMockup() {
  const [activeTab, setActiveTab] = useState('waveform');
  const lines = [
    { n: 1,  code: <><span className="c-kw">module</span> <span className="c-fn">traffic_light</span><span className="c-op">(</span></> },
    { n: 2,  code: <><span className="c-kw">  input</span> clk,</> },
    { n: 3,  code: <><span className="c-kw">  input</span> rst,</> },
    { n: 4,  code: <><span className="c-kw">  output reg</span> <span className="c-op">[</span><span className="c-num">1</span><span className="c-op">:0]</span> light</> },
    { n: 5,  code: <><span className="c-op">);</span></> },
    { n: 6,  code: null },
    { n: 7,  code: <><span className="c-kw">  parameter</span> RED    <span className="c-op">=</span> <span className="c-num">2'b00</span>;</> },
    { n: 8,  code: <><span className="c-kw">  parameter</span> YELLOW <span className="c-op">=</span> <span className="c-num">2'b01</span>;</> },
    { n: 9,  code: <><span className="c-kw">  parameter</span> GREEN  <span className="c-op">=</span> <span className="c-num">2'b10</span>;</> },
    { n: 10, code: null },
    { n: 11, code: <><span className="c-kw">  reg</span> <span className="c-op">[</span><span className="c-num">1</span><span className="c-op">:0]</span> state, next_state;</> },
    { n: 12, code: null },
    { n: 13, code: <><span className="c-cm">  // State register</span></> },
    { n: 14, code: <><span className="c-kw">  always</span> <span className="c-op">@(</span><span className="c-kw">posedge</span> clk<span className="c-op">)</span> <span className="c-kw">begin</span></> },
    { n: 15, code: <><span className="c-kw">    if</span> <span className="c-op">(</span>rst<span className="c-op">)</span></> },
    { n: 16, code: <>      state <span className="c-op">&lt;=</span> RED;</> },
    { n: 17, code: <><span className="c-kw">    else</span></> },
    { n: 18, code: <>      state <span className="c-op">&lt;=</span> next_state;</> },
    { n: 19, code: <><span className="c-kw">  end</span></> },
  ];

  return (
    <div className="lp-ide-wrap">
      <div className="lp-ide">
        <div className="lp-ide-topbar">
          <div className="lp-ide-dots"><span/><span/><span/></div>
          <div className="lp-ide-filename">
            <span style={{ color: '#A855F7' }}>Verilog</span>
            <span>traffic_light.v</span>
          </div>
          <button className="lp-ide-run">
            <svg width="9" height="10" viewBox="0 0 9 10" fill="white"><polygon points="0,0 9,5 0,10"/></svg>
            Run
          </button>
        </div>
        <div className="lp-ide-body">
          <div className="lp-ide-sidebar">
            {/* Grid icon */}
            <SidebarIcon active={false}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg>
            </SidebarIcon>
            {/* Book icon */}
            <SidebarIcon active={false}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>
            </SidebarIcon>
            {/* Code icon — active */}
            <SidebarIcon active={true}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>
            </SidebarIcon>
            {/* Flask icon */}
            <SidebarIcon active={false}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 3h6l1 9H8L9 3z"/><path d="M6.5 21h11l-2-9H8.5l-2 9z"/></svg>
            </SidebarIcon>
            {/* Trophy icon */}
            <SidebarIcon active={false}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/><path d="M4 22h16"/><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"/><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/><path d="M18 2H6v7a6 6 0 0 0 12 0V2z"/></svg>
            </SidebarIcon>
          </div>
          <div className="lp-ide-editor">
            {lines.map(l => (
              <div key={l.n} className="lp-ide-line">
                <span className="lp-ide-ln">{l.n}</span>
                <span className="lp-ide-code">{l.code}</span>
              </div>
            ))}
          </div>
          <div className="lp-ide-right">
            <div className="lp-ide-tabs">
              {['Simulation', 'Waveform', 'Output'].map(t => (
                <div
                  key={t}
                  className={`lp-ide-tab${activeTab === t.toLowerCase() ? ' active' : ''}`}
                  onClick={() => setActiveTab(t.toLowerCase())}
                >
                  {t}
                </div>
              ))}
            </div>
            {activeTab === 'waveform' && (
              <div className="lp-ide-waveform">
                <WaveformRow label="clk"      color="#00E5FF" pattern="clk"    />
                <WaveformRow label="rst"      color="#EF4444" pattern="rst"    />
                <WaveformRow label="light[1]" color="#A855F7" pattern="light1" />
                <WaveformRow label="light[0]" color="#34D399" pattern="light0" />
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6 }}>
                  {['0ns', '20ns', '40ns', '60ns', '80ns', '100ns'].map(t => (
                    <span key={t} style={{ fontSize: 8, color: '#2D3748' }}>{t}</span>
                  ))}
                </div>
              </div>
            )}
            {activeTab === 'simulation' && (
              <div style={{ padding: 10 }}>
                <div style={{ fontSize: 9, color: '#34D399', marginBottom: 6 }}>Simulation complete</div>
                <div style={{ fontSize: 9, color: '#64748B' }}>Time: 100ns · Events: 48</div>
              </div>
            )}
            {activeTab === 'output' && (
              <div style={{ padding: 10, fontFamily: 'monospace' }}>
                <div style={{ fontSize: 9, color: '#34D399' }}>VCD file written. No errors.</div>
              </div>
            )}
            <div className="lp-ide-testcases" style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
              <div className="lp-tc-title">Test Cases</div>
              {[
                { n: 1, name: 'Reset Test',       status: 'pass', time: '2 ms' },
                { n: 2, name: 'State Transition', status: 'pass', time: '3 ms' },
                { n: 3, name: 'Full Sequence',    status: 'pass', time: '4 ms' },
              ].map(tc => (
                <div key={tc.n} className="lp-tc-row">
                  <span className="lp-tc-num">{tc.n}</span>
                  <span className="lp-tc-name">{tc.name}</span>
                  <span className={`lp-tc-badge ${tc.status}`}>Passed</span>
                  <span className="lp-tc-time">{tc.time}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export { CircuitDeco, IDEMockup };
