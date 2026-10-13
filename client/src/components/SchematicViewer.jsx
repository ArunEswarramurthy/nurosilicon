import { useRef, useState, useCallback, useEffect } from 'react';
import { ZoomIn, ZoomOut, Maximize2, Grid3x3, CheckCircle2, XCircle, Info } from 'lucide-react';

const C = {
  bg:       '#0d0d0d',
  grid:     '#1a1a1a',
  wire:     '#00A6FF',
  wireOk:   '#10b981',
  wireFail: '#ef4444',
  gate:     '#1e2a3a',
  gateBdr:  '#00A6FF55',
  gateOk:   '#10b98130',
  gateFail: '#ef444430',
  input:    '#10b981',
  output:   '#f59e0b',
  clock:    '#a78bfa',
  text:     '#e2e8f0',
  muted:    '#555',
  trans:    '#6366f1',
  reset:    '#ef4444',
  module:   '#0ea5e9',
};

// ── Gate SVG shapes ───────────────────────────────────────────────────────────
function GateShape({ type, w = 60, h = 40, fill, stroke, sw = 1.5 }) {
  const hw = w / 2, hh = h / 2;
  switch (type) {
    case 'and':
      return <path d={`M0,0 L${hw},0 Q${w},0 ${w},${hh} Q${w},${h} ${hw},${h} L0,${h} Z`} fill={fill} stroke={stroke} strokeWidth={sw} />;
    case 'nand':
      return <>
        <path d={`M0,0 L${hw},0 Q${w},0 ${w},${hh} Q${w},${h} ${hw},${h} L0,${h} Z`} fill={fill} stroke={stroke} strokeWidth={sw} />
        <circle cx={w + 5} cy={hh} r={4} fill={fill} stroke={stroke} strokeWidth={sw} />
      </>;
    case 'or':
      return <path d={`M0,0 Q${hw * 0.4},${hh} 0,${h} Q${hw},${h * 0.85} ${w},${hh} Q${hw},${h * 0.15} 0,0 Z`} fill={fill} stroke={stroke} strokeWidth={sw} />;
    case 'nor':
      return <>
        <path d={`M0,0 Q${hw * 0.4},${hh} 0,${h} Q${hw},${h * 0.85} ${w},${hh} Q${hw},${h * 0.15} 0,0 Z`} fill={fill} stroke={stroke} strokeWidth={sw} />
        <circle cx={w + 5} cy={hh} r={4} fill={fill} stroke={stroke} strokeWidth={sw} />
      </>;
    case 'xor':
      return <>
        <path d={`M-6,0 Q${hw * 0.4 - 6},${hh} -6,${h}`} fill="none" stroke={stroke} strokeWidth={sw} />
        <path d={`M0,0 Q${hw * 0.4},${hh} 0,${h} Q${hw},${h * 0.85} ${w},${hh} Q${hw},${h * 0.15} 0,0 Z`} fill={fill} stroke={stroke} strokeWidth={sw} />
      </>;
    case 'xnor':
      return <>
        <path d={`M-6,0 Q${hw * 0.4 - 6},${hh} -6,${h}`} fill="none" stroke={stroke} strokeWidth={sw} />
        <path d={`M0,0 Q${hw * 0.4},${hh} 0,${h} Q${hw},${h * 0.85} ${w},${hh} Q${hw},${h * 0.15} 0,0 Z`} fill={fill} stroke={stroke} strokeWidth={sw} />
        <circle cx={w + 5} cy={hh} r={4} fill={fill} stroke={stroke} strokeWidth={sw} />
      </>;
    case 'not':
      return <>
        <polygon points={`0,0 ${w - 8},${hh} 0,${h}`} fill={fill} stroke={stroke} strokeWidth={sw} />
        <circle cx={w - 4} cy={hh} r={4} fill={fill} stroke={stroke} strokeWidth={sw} />
      </>;
    case 'buf':
      return <polygon points={`0,0 ${w},${hh} 0,${h}`} fill={fill} stroke={stroke} strokeWidth={sw} />;
    default:
      return <rect width={w} height={h} rx={6} fill={fill} stroke={stroke} strokeWidth={sw} />;
  }
}

const GATE_TYPES = new Set(['and','nand','or','nor','xor','xnor','not','buf',
  'xor_reduce','and_reduce','or_reduce']);

function nodeSize(type) {
  if (type === 'input' || type === 'output' || type === 'clock') return { w: 80, h: 28 };
  if (type === 'dff')    return { w: 80, h: 80 };
  if (type === 'module') return { w: 100, h: 80 };
  if (type === 'nsl' || type === 'odec') return { w: 90, h: 50 };
  if (GATE_TYPES.has(type)) return { w: 60, h: 40 };
  return { w: 70, h: 40 };
}

function getPorts(node) {
  const { w: W, h: H } = nodeSize(node.type);
  const cy = H / 2;
  if (node.type === 'input' || node.type === 'clock') return { out: { x: W, y: cy } };
  if (node.type === 'output') return { in: { x: 0, y: cy } };
  if (node.type === 'not' || node.type === 'buf') return { in: { x: 0, y: cy }, out: { x: W, y: cy } };
  if (node.type === 'xor_reduce') return { in: { x: 0, y: cy }, out: { x: W, y: cy } };
  if (GATE_TYPES.has(node.type)) {
    return { in0: { x: 0, y: H * 0.3 }, in1: { x: 0, y: H * 0.7 }, out: { x: W, y: cy } };
  }
  if (node.type === 'dff') return { d: { x: 0, y: H * 0.3 }, clk: { x: 0, y: H * 0.7 }, rst: { x: 0, y: H * 0.9 }, q: { x: W, y: H * 0.3 } };
  if (node.type === 'nsl' || node.type === 'odec') return { in: { x: 0, y: cy }, out: { x: W, y: cy } };
  if (node.type === 'module') return { in: { x: 0, y: cy }, out: { x: W, y: cy } };
  return { in: { x: 0, y: cy }, out: { x: W, y: cy } };
}

// ── Node renderer ─────────────────────────────────────────────────────────────
function NodeEl({ node, highlight, onClick, selected }) {
  const { w, h } = nodeSize(node.type);
  const cx = w / 2;
  const hl = selected ? 'selected' : highlight;
  const fill   = hl === 'pass' ? C.gateOk : hl === 'fail' ? C.gateFail : hl === 'selected' ? '#00A6FF22' : C.gate;
  const stroke = hl === 'pass' ? '#10b981' : hl === 'fail' ? '#ef4444' : hl === 'selected' ? '#00A6FF' : C.gateBdr;
  const sw     = hl ? 2 : 1.5;

  if (node.type === 'input' || node.type === 'output' || node.type === 'clock') {
    const base  = node.type === 'clock' ? C.clock : node.type === 'input' ? C.input : C.output;
    const color = hl === 'pass' ? '#10b981' : hl === 'fail' ? '#ef4444' : hl === 'selected' ? '#00A6FF' : base;
    return (
      <g transform={`translate(${node.x},${node.y})`} onClick={onClick} style={{ cursor: 'pointer' }}>
        <rect width={w} height={h} rx={5} fill={`${color}22`} stroke={color} strokeWidth={sw} />
        <text x={cx} y={h / 2 + 4} textAnchor="middle" fontSize={10} fontWeight={600} fill={color}
          style={{ fontFamily: 'monospace' }}>{node.label}</text>
        {node.type !== 'output' && <line x1={w} y1={h / 2} x2={w + 10} y2={h / 2} stroke={color} strokeWidth={1.5} />}
        {node.type === 'output' && <line x1={-10} y1={h / 2} x2={0} y2={h / 2} stroke={color} strokeWidth={1.5} />}
      </g>
    );
  }

  if (node.type === 'nsl') {
    return (
      <g transform={`translate(${node.x},${node.y})`} onClick={onClick} style={{ cursor: 'pointer' }}>
        <rect width={w} height={h} rx={6} fill={`${C.trans}18`} stroke={C.trans} strokeWidth={sw} />
        <text x={cx} y={h * 0.4} textAnchor="middle" fontSize={9} fontWeight={700} fill={C.trans}>Next-State</text>
        <text x={cx} y={h * 0.72} textAnchor="middle" fontSize={9} fontWeight={700} fill={C.trans}>Logic</text>
        <line x1={0} y1={h/2} x2={-8} y2={h/2} stroke={C.trans} strokeWidth={1.5} />
        <line x1={w} y1={h/2} x2={w+8} y2={h/2} stroke={C.trans} strokeWidth={1.5} />
      </g>
    );
  }

  if (node.type === 'odec') {
    return (
      <g transform={`translate(${node.x},${node.y})`} onClick={onClick} style={{ cursor: 'pointer' }}>
        <rect width={w} height={h} rx={6} fill={`${C.output}18`} stroke={C.output} strokeWidth={sw} />
        <text x={cx} y={h * 0.4} textAnchor="middle" fontSize={9} fontWeight={700} fill={C.output}>Output</text>
        <text x={cx} y={h * 0.72} textAnchor="middle" fontSize={9} fontWeight={700} fill={C.output}>Decoder</text>
        <line x1={0} y1={h/2} x2={-8} y2={h/2} stroke={C.output} strokeWidth={1.5} />
        <line x1={w} y1={h/2} x2={w+8} y2={h/2} stroke={C.output} strokeWidth={1.5} />
      </g>
    );
  }

  if (node.type === 'dff') {
    return (
      <g transform={`translate(${node.x},${node.y})`} onClick={onClick} style={{ cursor: 'pointer' }}>
        <rect width={w} height={h} rx={6} fill={fill} stroke={stroke} strokeWidth={sw} />
        <text x={cx} y={14} textAnchor="middle" fontSize={10} fontWeight={700} fill={C.text}>State Reg</text>
        <text x={6}  y={h * 0.3 + 4} fontSize={9} fill={C.muted}>D</text>
        <text x={6}  y={h * 0.7 + 4} fontSize={9} fill={C.clock}>▷clk</text>
        <text x={6}  y={h * 0.9 + 4} fontSize={9} fill={C.reset}>rst</text>
        <text x={w - 14} y={h * 0.3 + 4} fontSize={9} fill={C.text}>Q</text>
        {node.label && <text x={cx} y={h - 4} textAnchor="middle" fontSize={8} fill={C.muted}>{node.label}</text>}
      </g>
    );
  }

  if (node.type === 'module') {
    return (
      <g transform={`translate(${node.x},${node.y})`} onClick={onClick} style={{ cursor: 'pointer' }}>
        <rect width={w} height={h} rx={6} fill={`${C.module}18`} stroke={C.module} strokeWidth={sw} />
        {node.label.split('\n').map((line, i) => (
          <text key={i} x={cx} y={18 + i * 14} textAnchor="middle" fontSize={10}
            fontWeight={i === 0 ? 700 : 400} fill={i === 0 ? C.module : C.muted}>{line}</text>
        ))}
      </g>
    );
  }

  if (GATE_TYPES.has(node.type)) {
    const gtype = node.type === 'xor_reduce' ? 'xor' : node.type;
    return (
      <g transform={`translate(${node.x},${node.y})`} onClick={onClick} style={{ cursor: 'pointer' }}>
        <GateShape type={gtype} w={60} h={40} fill={fill} stroke={stroke} sw={sw} />
        <text x={30} y={24} textAnchor="middle" fontSize={9} fontWeight={700} fill={C.text}>
          {node.type === 'xor_reduce' ? '^' : node.type.toUpperCase()}
        </text>
      </g>
    );
  }

  return (
    <g transform={`translate(${node.x},${node.y})`} onClick={onClick} style={{ cursor: 'pointer' }}>
      <rect width={w} height={h} rx={6} fill={fill} stroke={stroke} strokeWidth={sw} />
      <text x={cx} y={h / 2 + 4} textAnchor="middle" fontSize={9} fontWeight={700} fill={C.text}>
        {node.label || node.type.toUpperCase()}
      </text>
    </g>
  );
}

// ── Wire ──────────────────────────────────────────────────────────────────────
function Wire({ x1, y1, x2, y2, highlight }) {
  const mx    = (x1 + x2) / 2;
  const color = highlight === 'pass' ? C.wireOk : highlight === 'fail' ? C.wireFail : C.wire;
  const sw    = highlight ? 2.5 : 1.5;
  const op    = highlight ? 1 : 0.55;
  return (
    <path
      d={`M${x1},${y1} C${mx},${y1} ${mx},${y2} ${x2},${y2}`}
      fill="none" stroke={color} strokeWidth={sw} strokeOpacity={op}
    />
  );
}

// ── Build port-position map ───────────────────────────────────────────────────
function buildPortMap(nodes) {
  const map = {};
  for (const n of nodes) {
    const ports = getPorts(n);
    for (const [pname, rel] of Object.entries(ports)) {
      map[`${n.id}.${pname}`] = { x: n.x + rel.x, y: n.y + rel.y };
    }
  }
  return map;
}

// ── FSM diagram renderer ──────────────────────────────────────────────────
function FSMDiagram({ schematic, result }) {
  const { fsmGraph, nodes = [], connections = [] } = schematic;
  const allPassed = result && result.passed === result.total && result.total > 0;
  const anyFailed = result && !result.compile_error && result.passed < result.total;

  const states      = fsmGraph?.states || [];
  const transitions = fsmGraph?.transitions || [];
  const resetState  = fsmGraph?.resetState;
  const R = 36;

  // ── Structural block layout ───────────────────────────────────────────────
  // Position structural nodes in a clear left-to-right layout:
  //   inputs (x=20) → DFF (x=160) → NSL/ODEC (x=280) → outputs (x=420)
  // This is separate from the state bubble positions (which are in fsmGraph.states)
  const structNodes = nodes.map(n => ({ ...n })); // clone to avoid mutating
  const inputNodes  = structNodes.filter(n => n.type === 'input' || n.type === 'clock');
  const outputNodes = structNodes.filter(n => n.type === 'output');
  const dffNodes    = structNodes.filter(n => n.type === 'dff');
  const nslNodes    = structNodes.filter(n => n.type === 'nsl');
  const odecNodes   = structNodes.filter(n => n.type === 'odec');

  // Structural layout — offset to the right of the state diagram
  const SX = 340; // structural section starts at x=340
  inputNodes.forEach((n, i)  => { n.x = SX;       n.y = 40 + i * 55; });
  dffNodes.forEach((n, i)    => { n.x = SX + 130;  n.y = 40 + i * 90; });
  nslNodes.forEach((n, i)    => { n.x = SX + 130;  n.y = 140 + i * 60; });
  odecNodes.forEach((n, i)   => { n.x = SX + 130;  n.y = 210 + i * 60; });
  outputNodes.forEach((n, i) => { n.x = SX + 260;  n.y = 40 + i * 55; });

  // Build port map for structural wires
  const structPortMap = {};
  for (const n of structNodes) {
    const ports = getPorts(n);
    for (const [pname, rel] of Object.entries(ports)) {
      structPortMap[`${n.id}.${pname}`] = { x: n.x + rel.x, y: n.y + rel.y };
    }
  }

  const tColor = allPassed ? '#10b981' : anyFailed ? '#ef4444' : C.trans;

  return (
    <g>
      <defs>
        <marker id="fsm-arrow" markerWidth={8} markerHeight={8} refX={6} refY={3} orient="auto">
          <path d="M0,0 L0,6 L8,3 Z" fill={tColor} />
        </marker>
        <marker id="fsm-arrow-rst" markerWidth={8} markerHeight={8} refX={6} refY={3} orient="auto">
          <path d="M0,0 L0,6 L8,3 Z" fill={C.reset} />
        </marker>
        <marker id="fsm-arrow-wire" markerWidth={8} markerHeight={8} refX={6} refY={3} orient="auto">
          <path d="M0,0 L0,6 L8,3 Z" fill={C.wire} />
        </marker>
      </defs>

      {/* ── LEFT: State Diagram ── */}
      {/* Divider label */}
      <text x={10} y={16} fontSize={9} fill="#444" fontFamily="monospace" fontWeight={700}>STATE DIAGRAM</text>
      <line x1={10} y1={20} x2={320} y2={20} stroke="#222" strokeWidth={0.5} />

      {/* Reset arrow */}
      {resetState && states.find(s => s.id === resetState) && (() => {
        const s = states.find(st => st.id === resetState);
        return (
          <g>
            <line x1={s.x - R - 28} y1={s.y} x2={s.x - R - 2} y2={s.y}
              stroke={C.reset} strokeWidth={1.5} markerEnd="url(#fsm-arrow-rst)" />
            <text x={s.x - R - 14} y={s.y - 6} fontSize={8} fill={C.reset} textAnchor="middle">rst</text>
          </g>
        );
      })()}

      {/* Transition arrows */}
      {transitions.map((t, i) => {
        const from = states.find(s => s.id === t.from);
        const to   = states.find(s => s.id === t.to);
        if (!from || !to) return null;
        if (t.from === t.to) {
          return (
            <g key={i}>
              <path d={`M${from.x + R * 0.7},${from.y - R} A${R * 0.8},${R * 0.8} 0 1 1 ${from.x + R},${from.y - R * 0.7}`}
                fill="none" stroke={tColor} strokeWidth={1.5} markerEnd="url(#fsm-arrow)" />
            </g>
          );
        }
        const dx = to.x - from.x, dy = to.y - from.y;
        const len = Math.sqrt(dx * dx + dy * dy) || 1;
        const ux = dx / len, uy = dy / len;
        const x1 = from.x + ux * R, y1 = from.y + uy * R;
        const x2 = to.x   - ux * R, y2 = to.y   - uy * R;
        const mx = (x1 + x2) / 2 - uy * 16, my = (y1 + y2) / 2 + ux * 16;
        return (
          <g key={i}>
            <path d={`M${x1},${y1} Q${mx},${my} ${x2},${y2}`}
              fill="none" stroke={tColor} strokeWidth={1.5} markerEnd="url(#fsm-arrow)" />
          </g>
        );
      })}

      {/* State bubbles */}
      {states.map(s => {
        const base  = s.color || C.trans;
        const color = allPassed ? '#10b981' : anyFailed ? '#ef4444' : base;
        return (
          <g key={s.id}>
            <circle cx={s.x} cy={s.y} r={R} fill={`${color}18`} stroke={color} strokeWidth={2} />
            <text x={s.x} y={s.y + 4} textAnchor="middle" fontSize={10} fontWeight={700} fill={color}>{s.label}</text>
          </g>
        );
      })}

      {states.length === 0 && (
        <text x={160} y={160} textAnchor="middle" fontSize={11} fill={C.muted}>
          FSM detected — use localparam/parameter for state names
        </text>
      )}

      {/* ── RIGHT: Structural Block Diagram ── */}
      <text x={SX} y={16} fontSize={9} fill="#444" fontFamily="monospace" fontWeight={700}>STRUCTURAL VIEW [RTL]</text>
      <line x1={SX} y1={20} x2={SX + 360} y2={20} stroke="#222" strokeWidth={0.5} />

      {/* Structural wires */}
      {connections.map((c, i) => {
        const p1 = structPortMap[c.from];
        const p2 = structPortMap[c.to];
        if (!p1 || !p2) return null;
        const mx = (p1.x + p2.x) / 2;
        // Feedback wire (NSL.out -> DFF.d) curves below
        const isNSLFeedback = c.from.startsWith('nsl.') && c.to.includes('.d');
        if (isNSLFeedback) {
          const cy1 = Math.max(p1.y, p2.y) + 30;
          return (
            <path key={i}
              d={`M${p1.x},${p1.y} C${p1.x + 20},${cy1} ${p2.x - 20},${cy1} ${p2.x},${p2.y}`}
              fill="none" stroke={C.wire} strokeWidth={1.5} strokeOpacity={0.7}
              markerEnd="url(#fsm-arrow-wire)"
            />
          );
        }
        return (
          <path key={i}
            d={`M${p1.x},${p1.y} C${mx},${p1.y} ${mx},${p2.y} ${p2.x},${p2.y}`}
            fill="none" stroke={C.wire} strokeWidth={1.5} strokeOpacity={0.7}
            markerEnd="url(#fsm-arrow-wire)"
          />
        );
      })}

      {/* Structural nodes */}
      {structNodes.map(n => (
        <NodeEl key={n.id} node={n} highlight={null} selected={false} onClick={() => {}} />
      ))}
    </g>
  );
}
// ── Gate diagram (combinational + sequential) ─────────────────────────────────
function GateDiagram({ schematic, result, selectedNode, onSelectNode }) {
  const { nodes = [], connections = [] } = schematic;
  const allPassed = result && result.passed === result.total && result.total > 0;
  const anyFailed = result && !result.compile_error && result.passed < result.total;
  const highlight = allPassed ? 'pass' : anyFailed ? 'fail' : null;
  const portMap   = buildPortMap(nodes);

  return (
    <g>
      {connections.map((c, i) => {
        const p1 = portMap[c.from], p2 = portMap[c.to];
        if (!p1 || !p2) return null;
        return <Wire key={i} x1={p1.x} y1={p1.y} x2={p2.x} y2={p2.y} highlight={highlight} />;
      })}
      {nodes.map(n => (
        <NodeEl
          key={n.id} node={n} highlight={highlight}
          selected={selectedNode === n.id}
          onClick={() => onSelectNode(n.id === selectedNode ? null : n.id)}
        />
      ))}
    </g>
  );
}

// ── Empty / error states ──────────────────────────────────────────────────────
function EmptySchematic({ message, sub }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: 10, color: '#444' }}>
      <svg width={44} height={44} viewBox="0 0 48 48" fill="none">
        <rect x={4} y={4} width={40} height={40} rx={8} stroke="#333" strokeWidth={2} />
        <path d="M14 24h6M28 24h6M24 14v6M24 28v6" stroke="#333" strokeWidth={2} strokeLinecap="round" />
        <circle cx={24} cy={24} r={4} stroke="#333" strokeWidth={2} />
      </svg>
      <p style={{ fontSize: 13, fontWeight: 600, margin: 0, color: '#666' }}>{message}</p>
      {sub && <p style={{ fontSize: 11, margin: 0, color: '#444', textAlign: 'center', maxWidth: 260 }}>{sub}</p>}
    </div>
  );
}

// ── Node inspector panel ──────────────────────────────────────────────────────
function NodeInspector({ node, onClose }) {
  if (!node) return null;
  const { w, h } = nodeSize(node.type);
  return (
    <div style={{
      position: 'absolute', bottom: 8, left: 8, background: '#111', border: '1px solid #2a2a2a',
      borderRadius: 10, padding: '10px 14px', minWidth: 180, zIndex: 10, fontSize: 12,
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
        <span style={{ fontWeight: 700, color: '#e2e8f0' }}>{node.label || node.type}</span>
        <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#555', cursor: 'pointer', fontSize: 14 }}>×</button>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 3, color: '#888' }}>
        <span>Type: <span style={{ color: '#00A6FF' }}>{node.type}</span></span>
        {node.width > 1 && <span>Width: <span style={{ color: '#f59e0b' }}>{node.width} bits</span></span>}
        {node.portName && <span>Port: <span style={{ color: '#10b981' }}>{node.portName}</span></span>}
        {node.clock && <span>Clock: <span style={{ color: '#a78bfa' }}>{node.clock}</span></span>}
        <span>Size: {w}×{h}px</span>
      </div>
    </div>
  );
}

// ── Main export ───────────────────────────────────────────────────────────────
export default function SchematicViewer({ schematic, result, sourceHash }) {
  const svgRef      = useRef(null);
  const [vp, setVp] = useState({ x: 40, y: 40, scale: 1 });
  const [grid, setGrid]           = useState(true);
  const [selectedNode, setSelectedNode] = useState(null);
  const dragging = useRef(false);
  const last     = useRef({ x: 0, y: 0 });
  const vpRef    = useRef(vp);
  vpRef.current  = vp;

  // Reset view when schematic changes
  useEffect(() => { setVp({ x: 40, y: 40, scale: 1 }); setSelectedNode(null); }, [schematic]);

  const onWheel = useCallback((e) => {
    e.preventDefault();
    setVp(v => ({ ...v, scale: Math.min(4, Math.max(0.15, v.scale * (e.deltaY < 0 ? 1.12 : 0.9))) }));
  }, []);

  useEffect(() => {
    const el = svgRef.current;
    if (!el) return;
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, [onWheel]);

  const onMouseDown = (e) => { dragging.current = true; last.current = { x: e.clientX, y: e.clientY }; };
  const onMouseMove = (e) => {
    if (!dragging.current) return;
    setVp(v => ({ ...v, x: v.x + e.clientX - last.current.x, y: v.y + e.clientY - last.current.y }));
    last.current = { x: e.clientX, y: e.clientY };
  };
  const onMouseUp = () => { dragging.current = false; };

  const fitToScreen = useCallback(() => {
    if (!schematic?.nodes?.length) return;
    const xs = schematic.nodes.map(n => n.x);
    const ys = schematic.nodes.map(n => n.y);
    const minX = Math.min(...xs) - 20;
    const minY = Math.min(...ys) - 20;
    const maxX = Math.max(...xs.map((x, i) => x + nodeSize(schematic.nodes[i].type).w)) + 20;
    const maxY = Math.max(...ys.map((y, i) => y + nodeSize(schematic.nodes[i].type).h)) + 20;
    const svgEl = svgRef.current;
    if (!svgEl) return;
    const { width, height } = svgEl.getBoundingClientRect();
    const scaleX = width  / (maxX - minX);
    const scaleY = height / (maxY - minY);
    const scale  = Math.min(scaleX, scaleY, 2);
    setVp({ x: -minX * scale + 20, y: -minY * scale + 20, scale });
  }, [schematic]);

  // ── Render guards ─────────────────────────────────────────────────────────
  if (!schematic) {
    return <EmptySchematic message="No schematic yet" sub="Click Analyze to generate the circuit diagram from your RTL code." />;
  }
  if (schematic.error) {
    return <EmptySchematic message="Schematic unavailable" sub={schematic.error} />;
  }
  if (!schematic.nodes?.length) {
    return <EmptySchematic message="No circuit elements found" sub="The analyzer could not extract any gates or ports from this RTL." />;
  }

  const allPassed = result && result.passed === result.total && result.total > 0;
  const anyFailed = result && !result.compile_error && result.passed < result.total;
  const selectedNodeObj = schematic.nodes?.find(n => n.id === selectedNode);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: C.bg }}>
      {/* Toolbar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 10px', borderBottom: '1px solid #1e1e1e', flexShrink: 0, background: '#111' }}>
        <span style={{ fontSize: 12, fontWeight: 700, color: '#e2e8f0', flex: 1 }}>
          {schematic.title || schematic.moduleName || 'Schematic'}
          <span style={{ fontSize: 10, color: '#555', marginLeft: 8, fontFamily: 'monospace' }}>
            [{schematic.type}]
          </span>
        </span>
        {allPassed && (
          <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 99, background: '#10b98120', color: '#10b981', border: '1px solid #10b98140' }}>
            <CheckCircle2 size={10} />All Pass
          </span>
        )}
        {anyFailed && (
          <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 99, background: '#ef444420', color: '#ef4444', border: '1px solid #ef444440' }}>
            <XCircle size={10} />{result.passed}/{result.total} Pass
          </span>
        )}
        {!result && <span style={{ fontSize: 10, color: '#444' }}>Run code to see signal states</span>}
        {sourceHash && (
          <span style={{ fontSize: 9, color: '#333', fontFamily: 'monospace' }} title="Source hash">#{sourceHash.slice(0, 8)}</span>
        )}
        <button onClick={fitToScreen} title="Fit to screen" style={{ background: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: 6, padding: '3px 6px', cursor: 'pointer', color: '#888' }}>
          <Maximize2 size={12} />
        </button>
        <button onClick={() => setVp(v => ({ ...v, scale: Math.min(4, v.scale * 1.2) }))} style={{ background: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: 6, padding: '3px 6px', cursor: 'pointer', color: '#888' }}>
          <ZoomIn size={12} />
        </button>
        <button onClick={() => setVp(v => ({ ...v, scale: Math.max(0.15, v.scale * 0.8) }))} style={{ background: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: 6, padding: '3px 6px', cursor: 'pointer', color: '#888' }}>
          <ZoomOut size={12} />
        </button>
        <button onClick={() => setGrid(g => !g)} style={{ background: grid ? '#00A6FF20' : '#1a1a1a', border: `1px solid ${grid ? '#00A6FF40' : '#2a2a2a'}`, borderRadius: 6, padding: '3px 6px', cursor: 'pointer', color: grid ? '#00A6FF' : '#888' }}>
          <Grid3x3 size={12} />
        </button>
      </div>

      {/* Canvas */}
      <div style={{ flex: 1, overflow: 'hidden', cursor: 'grab', position: 'relative', minHeight: 0 }}>
        <svg
          ref={svgRef} width="100%" height="100%"
          onMouseDown={onMouseDown} onMouseMove={onMouseMove}
          onMouseUp={onMouseUp} onMouseLeave={onMouseUp}
          style={{ userSelect: 'none', display: 'block' }}
        >
          <defs>
            {grid && (
              <pattern id="sgrid" width={20} height={20} patternUnits="userSpaceOnUse">
                <path d="M20,0 L0,0 0,20" fill="none" stroke={C.grid} strokeWidth={0.5} />
              </pattern>
            )}
          </defs>
          {grid && <rect width="100%" height="100%" fill="url(#sgrid)" />}
          <g transform={`translate(${vp.x},${vp.y}) scale(${vp.scale})`}>
            {schematic.isFSM
              ? <FSMDiagram schematic={schematic} result={result} />
              : <GateDiagram schematic={schematic} result={result} selectedNode={selectedNode} onSelectNode={setSelectedNode} />
            }
          </g>
        </svg>
        <div style={{ position: 'absolute', bottom: 8, right: 10, fontSize: 10, color: '#333', fontFamily: 'monospace' }}>
          {Math.round(vp.scale * 100)}%
        </div>
        <NodeInspector node={selectedNodeObj} onClose={() => setSelectedNode(null)} />
      </div>

      {/* Legend */}
      <div style={{ display: 'flex', gap: 12, padding: '4px 10px', borderTop: '1px solid #1a1a1a', flexShrink: 0, background: '#0a0a0a' }}>
        {[
          { color: C.input,  label: 'Input' },
          { color: C.output, label: 'Output' },
          { color: C.clock,  label: 'Clock' },
          { color: C.wire,   label: 'Wire' },
          { color: C.module, label: 'Module' },
        ].map(({ color, label }) => (
          <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <div style={{ width: 8, height: 8, borderRadius: 2, background: color }} />
            <span style={{ fontSize: 9, color: '#444' }}>{label}</span>
          </div>
        ))}
        <div style={{ flex: 1 }} />
        <span style={{ fontSize: 9, color: '#333' }}>
          {schematic.nodes?.length} nodes · {schematic.connections?.length} wires
        </span>
      </div>
    </div>
  );
}
