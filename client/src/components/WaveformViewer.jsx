import { useMemo, useRef, useState, useCallback, useEffect } from 'react';
import { ZoomIn, ZoomOut, Maximize2, Search, X } from 'lucide-react';

// ── VCD Parser ────────────────────────────────────────────────────────────────
function parseVCD(vcdText) {
  if (!vcdText || typeof vcdText !== 'string') return null;

  const symbolMap  = {};  // symbol -> { name, width, scope }
  const signals    = [];  // ordered signal names
  const scopeStack = [];
  const timeline   = [];
  let currentTime  = 0;
  let currentVals  = {};
  let inDumpvars   = false;
  let timescale    = '1ns';

  const lines = vcdText.split('\n');
  for (const raw of lines) {
    const line = raw.trim();
    if (!line) continue;

    // $timescale
    if (line.startsWith('$timescale')) {
      const m = line.match(/\$timescale\s+(.+?)\s*\$end/);
      if (m) timescale = m[1].trim();
      continue;
    }

    // $scope
    if (line.startsWith('$scope')) {
      const m = line.match(/\$scope\s+\w+\s+(\w+)/);
      if (m) scopeStack.push(m[1]);
      continue;
    }
    if (line.startsWith('$upscope')) {
      scopeStack.pop();
      continue;
    }

    // $var reg/wire N symbol name $end
    const varMatch = line.match(/^\$var\s+\w+\s+(\d+)\s+(\S+)\s+(\w+)(?:\s+\[\d+:\d+\])?\s*\$end/);
    if (varMatch) {
      const width  = parseInt(varMatch[1]);
      const sym    = varMatch[2];
      const name   = varMatch[3];
      const scope  = scopeStack.join('.');
      const fullName = scope ? `${scope}.${name}` : name;
      if (!symbolMap[sym]) {
        symbolMap[sym] = { name: fullName, shortName: name, width, scope };
        if (!signals.find(s => s.name === fullName)) {
          signals.push({ name: fullName, shortName: name, width, scope });
        }
      }
      continue;
    }

    if (line === '$dumpvars') { inDumpvars = true; continue; }

    if (line === '$end') {
      if (inDumpvars) {
        inDumpvars = false;
        if (Object.keys(currentVals).length > 0) {
          timeline.push({ time: currentTime, vals: { ...currentVals } });
          currentVals = {};
        }
      }
      continue;
    }

    if (line.startsWith('$')) continue;

    // Timestamp
    if (line.startsWith('#')) {
      const t = parseInt(line.slice(1));
      if (!isNaN(t)) {
        if (Object.keys(currentVals).length > 0) {
          timeline.push({ time: currentTime, vals: { ...currentVals } });
          currentVals = {};
        }
        currentTime = t;
      }
      continue;
    }

    // Single-bit value change: 0! 1! x! z!
    const scalarMatch = line.match(/^([01xzXZ])(\S+)$/);
    if (scalarMatch) {
      const sym  = scalarMatch[2];
      const info = symbolMap[sym];
      if (info) {
        const raw = scalarMatch[1].toLowerCase();
        currentVals[info.name] = raw === 'x' ? 'x' : raw === 'z' ? 'z' : parseInt(raw);
      }
      continue;
    }

    // Multi-bit value: b1010 !
    const busMatch = line.match(/^b([01xzXZ]+)\s+(\S+)$/i);
    if (busMatch) {
      const sym  = busMatch[2];
      const info = symbolMap[sym];
      if (info) {
        const bits = busMatch[1].toLowerCase();
        if (bits.includes('x') || bits.includes('z')) {
          currentVals[info.name] = bits; // keep as string for X/Z
        } else {
          currentVals[info.name] = parseInt(bits, 2);
        }
      }
      continue;
    }
  }

  // Flush final
  if (Object.keys(currentVals).length > 0) {
    timeline.push({ time: currentTime, vals: { ...currentVals } });
  }

  if (signals.length === 0 || timeline.length === 0) return null;

  // Forward-fill: every signal has a value at every timestamp
  const filled = [];
  let prev = {};
  for (const entry of timeline) {
    const merged = { ...prev, ...entry.vals };
    filled.push({ time: entry.time, vals: merged });
    prev = merged;
  }

  const maxTime = filled[filled.length - 1]?.time || 0;
  return { signals, timeline: filled, maxTime, timescale };
}

// ── Constants ─────────────────────────────────────────────────────────────────
const LABEL_W  = 100;
const ROW_H    = 40;
const PAD_TOP  = 28;
const SIG_HIGH = 6;
const SIG_LOW  = 28;
const BUS_MID  = 17;

function sigColor(name) {
  if (/^clk|clock$/i.test(name)) return '#a78bfa';
  if (/^rst|reset$/i.test(name)) return '#ef4444';
  if (/^(a|b|c|d|e|f|g|h|in)/i.test(name)) return '#10b981';
  if (/^(y|out|q|sum|cout|result)/i.test(name)) return '#f59e0b';
  return '#00A6FF';
}

function fmtVal(val, width, hex) {
  if (val === 'x' || val === undefined) return 'X';
  if (val === 'z') return 'Z';
  if (typeof val === 'string' && /[xz]/i.test(val)) return val.toUpperCase();
  if (width === 1) return String(val & 1);
  const n = typeof val === 'number' ? val : parseInt(val, 2);
  if (hex) return `0x${n.toString(16).toUpperCase().padStart(Math.ceil(width / 4), '0')}`;
  return n.toString(2).padStart(width, '0');
}

// ── Waveform row ──────────────────────────────────────────────────────────────
function WaveRow({ sig, timeline, maxTime, rowY, timeToX, cursorTime, hex }) {
  const { name, shortName, width } = sig;
  const color = sigColor(shortName);
  const segs  = [];

  for (let i = 0; i < timeline.length; i++) {
    const val   = timeline[i].vals[name];
    const tNext = timeline[i + 1];
    const x1    = timeToX(timeline[i].time);
    const x2    = tNext ? timeToX(tNext.time) : timeToX(maxTime) + 20;
    segs.push({ x1, x2, val, time: timeline[i].time });
  }

  const isX = (v) => v === 'x' || v === undefined || (typeof v === 'string' && v.includes('x'));
  const isZ = (v) => v === 'z' || (typeof v === 'string' && v.includes('z'));

  return (
    <g>
      {segs.map((seg, idx) => {
        const prev = segs[idx - 1];
        const isXval = isX(seg.val);
        const isZval = isZ(seg.val);

        if (width === 1) {
          const hi  = seg.val === 1;
          const y   = rowY + (hi ? SIG_HIGH : SIG_LOW);
          const yPrev = prev ? rowY + (prev.val === 1 ? SIG_HIGH : SIG_LOW) : y;
          const c   = isXval ? '#f59e0b' : isZval ? '#6366f1' : color;
          return (
            <g key={idx}>
              {idx > 0 && prev.val !== seg.val && (
                <line x1={seg.x1} y1={yPrev} x2={seg.x1} y2={y} stroke={c} strokeWidth={1.5} />
              )}
              <line x1={seg.x1} y1={y} x2={seg.x2} y2={y} stroke={c} strokeWidth={1.5} />
            </g>
          );
        }

        // Multi-bit bus
        const segW = seg.x2 - seg.x1;
        const c    = isXval ? '#f59e0b' : isZval ? '#6366f1' : color;
        const label = fmtVal(seg.val, width, hex);
        return (
          <g key={idx}>
            {idx > 0 && (
              <>
                <line x1={seg.x1} y1={rowY + SIG_HIGH} x2={seg.x1 - 4} y2={rowY + BUS_MID} stroke={c} strokeWidth={1.5} />
                <line x1={seg.x1} y1={rowY + SIG_LOW}  x2={seg.x1 - 4} y2={rowY + BUS_MID} stroke={c} strokeWidth={1.5} />
                <line x1={seg.x1} y1={rowY + BUS_MID}  x2={seg.x1 + 4} y2={rowY + SIG_HIGH} stroke={c} strokeWidth={1.5} />
                <line x1={seg.x1} y1={rowY + BUS_MID}  x2={seg.x1 + 4} y2={rowY + SIG_LOW}  stroke={c} strokeWidth={1.5} />
              </>
            )}
            <line x1={Math.max(seg.x1, seg.x1 + 4)} y1={rowY + SIG_HIGH} x2={seg.x2} y2={rowY + SIG_HIGH} stroke={c} strokeWidth={1.5} />
            <line x1={Math.max(seg.x1, seg.x1 + 4)} y1={rowY + SIG_LOW}  x2={seg.x2} y2={rowY + SIG_LOW}  stroke={c} strokeWidth={1.5} />
            {isXval && <rect x={seg.x1 + 4} y={rowY + SIG_HIGH} width={Math.max(0, segW - 4)} height={SIG_LOW - SIG_HIGH} fill="#f59e0b18" />}
            {segW > 20 && (
              <text x={seg.x1 + segW / 2} y={rowY + BUS_MID + 4} textAnchor="middle"
                fontSize={9} fill={c} fontFamily="monospace"
                style={{ pointerEvents: 'none' }}>
                {label.length > Math.floor(segW / 7) ? label.slice(0, Math.floor(segW / 7) - 1) + '…' : label}
              </text>
            )}
          </g>
        );
      })}

      {/* Cursor value */}
      {cursorTime !== null && (() => {
        let closest = timeline[0];
        for (const e of timeline) { if (e.time <= cursorTime) closest = e; }
        const val = closest?.vals[name];
        return (
          <text
            x={LABEL_W - 4} y={rowY + BUS_MID + 4}
            textAnchor="end" fontSize={9} fill={color} fontFamily="monospace"
          >
            {fmtVal(val, width, hex)}
          </text>
        );
      })()}
    </g>
  );
}

// ── Main WaveformViewer ───────────────────────────────────────────────────────
export default function WaveformViewer({ vcdText, runId }) {
  const containerRef = useRef(null);
  const [zoom, setZoom]         = useState(1);
  const [panX, setPanX]         = useState(0);
  const [cursorTime, setCursor] = useState(null);
  const [search, setSearch]     = useState('');
  const [hex, setHex]           = useState(false);
  const [stale, setStale]       = useState(false);
  const prevRunId = useRef(null);
  const dragging  = useRef(false);
  const dragStart = useRef({ x: 0, pan: 0 });

  // Detect stale: if runId changes while we still have old vcdText
  useEffect(() => {
    if (runId && prevRunId.current && runId !== prevRunId.current) {
      setStale(true);
    } else {
      setStale(false);
    }
    prevRunId.current = runId;
  }, [runId]);

  const parsed = useMemo(() => parseVCD(vcdText), [vcdText]);

  const onWheel = useCallback((e) => {
    e.preventDefault();
    const factor = e.deltaY < 0 ? 1.15 : 0.87;
    setZoom(z => Math.min(20, Math.max(0.5, z * factor)));
  }, []);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, [onWheel]);

  const onMouseDown = (e) => {
    if (e.button !== 0) return;
    dragging.current = true;
    dragStart.current = { x: e.clientX, pan: panX };
  };
  const onMouseMove = useCallback((e) => {
    if (dragging.current) {
      setPanX(dragStart.current.pan + e.clientX - dragStart.current.x);
    }
    // Update cursor
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect || !parsed) return;
    const mx = e.clientX - rect.left - LABEL_W + panX;
    if (mx < 0) { setCursor(null); return; }
    const drawW = (rect.width - LABEL_W) * zoom;
    const t = parsed.maxTime > 0 ? Math.round((mx / drawW) * parsed.maxTime) : 0;
    setCursor(Math.max(0, Math.min(t, parsed.maxTime)));
  }, [parsed, panX, zoom]);
  const onMouseUp = () => { dragging.current = false; };

  // ── Empty / error states ────────────────────────────────────────────────
  if (!vcdText) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: 8, color: '#444' }}>
        <svg width={48} height={32} viewBox="0 0 48 32">
          <polyline points="0,24 8,24 8,8 16,8 16,24 24,24 24,8 32,8 32,24 40,24 40,8 48,8"
            fill="none" stroke="#333" strokeWidth={2} />
        </svg>
        <p style={{ fontSize: 13, fontWeight: 600, margin: 0, color: '#555' }}>No waveform yet</p>
        <p style={{ fontSize: 11, margin: 0, color: '#444' }}>Run your code to generate signal traces</p>
      </div>
    );
  }

  if (!parsed) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#555', fontSize: 13 }}>
        Could not parse waveform data
      </div>
    );
  }

  const { signals, timeline, maxTime, timescale } = parsed;
  const visibleSigs = search
    ? signals.filter(s => s.name.toLowerCase().includes(search.toLowerCase()) || s.shortName.toLowerCase().includes(search.toLowerCase()))
    : signals;

  const svgW    = 2000;
  const drawW   = (svgW - LABEL_W) * zoom;
  const svgH    = PAD_TOP + visibleSigs.length * ROW_H + 10;
  const timeToX = (t) => LABEL_W + panX + (maxTime > 0 ? (t / maxTime) * drawW : 0);

  // Cursor X position
  const cursorX = cursorTime !== null ? timeToX(cursorTime) : null;

  // Time axis ticks
  const tickCount = Math.min(20, Math.max(5, Math.floor(drawW / 80)));
  const ticks = Array.from({ length: tickCount + 1 }, (_, i) => Math.round((i / tickCount) * maxTime));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: '#0d0d0d' }}>
      {/* Toolbar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '5px 8px', borderBottom: '1px solid #1a1a1a', flexShrink: 0, background: '#111' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, background: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: 6, padding: '2px 8px', flex: 1, maxWidth: 200 }}>
          <Search size={11} color="#555" />
          <input
            value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search signals…"
            style={{ background: 'none', border: 'none', outline: 'none', color: '#e2e8f0', fontSize: 11, width: '100%' }}
          />
          {search && <button onClick={() => setSearch('')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#555', padding: 0 }}><X size={10} /></button>}
        </div>
        <button onClick={() => setHex(h => !h)} style={{ fontSize: 10, padding: '2px 8px', borderRadius: 6, background: hex ? '#00A6FF20' : '#1a1a1a', border: `1px solid ${hex ? '#00A6FF40' : '#2a2a2a'}`, color: hex ? '#00A6FF' : '#888', cursor: 'pointer' }}>
          {hex ? 'HEX' : 'BIN'}
        </button>
        <button onClick={() => setZoom(z => Math.min(20, z * 1.3))} style={{ background: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: 6, padding: '3px 6px', cursor: 'pointer', color: '#888' }}>
          <ZoomIn size={12} />
        </button>
        <button onClick={() => setZoom(z => Math.max(0.5, z * 0.77))} style={{ background: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: 6, padding: '3px 6px', cursor: 'pointer', color: '#888' }}>
          <ZoomOut size={12} />
        </button>
        <button onClick={() => { setZoom(1); setPanX(0); }} style={{ background: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: 6, padding: '3px 6px', cursor: 'pointer', color: '#888' }}>
          <Maximize2 size={12} />
        </button>
        <span style={{ fontSize: 9, color: '#333', fontFamily: 'monospace', marginLeft: 4 }}>
          {timescale} · {signals.length} sigs · {maxTime}{timescale.replace(/\d+/g, '')}
        </span>
        {stale && (
          <span style={{ fontSize: 10, color: '#f59e0b', background: '#f59e0b15', border: '1px solid #f59e0b30', borderRadius: 6, padding: '2px 8px' }}>
            ⚠ Stale — re-run to refresh
          </span>
        )}
      </div>

      {/* Waveform canvas */}
      <div
        ref={containerRef}
        style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', cursor: dragging.current ? 'grabbing' : 'crosshair', position: 'relative' }}
        onMouseDown={onMouseDown} onMouseMove={onMouseMove}
        onMouseUp={onMouseUp} onMouseLeave={onMouseUp}
      >
        <svg width="100%" height={svgH} style={{ minHeight: svgH, display: 'block' }}>
          {/* Time axis */}
          <rect x={0} y={0} width="100%" height={PAD_TOP} fill="#0a0a0a" />
          {ticks.map(t => {
            const x = timeToX(t);
            if (x < LABEL_W || x > LABEL_W + drawW + 40) return null;
            return (
              <g key={t}>
                <line x1={x} y1={PAD_TOP - 6} x2={x} y2={PAD_TOP} stroke="#2a2a2a" strokeWidth={1} />
                <text x={x} y={PAD_TOP - 8} fontSize={8} fill="#444" textAnchor="middle" fontFamily="monospace">{t}</text>
              </g>
            );
          })}
          <text x={LABEL_W - 4} y={PAD_TOP - 8} fontSize={8} fill="#333" textAnchor="end" fontFamily="monospace">
            {timescale}
          </text>

          {/* Signal rows */}
          {visibleSigs.map((sig, si) => {
            const rowY = PAD_TOP + si * ROW_H;
            return (
              <g key={sig.name}>
                <rect x={0} y={rowY} width="100%" height={ROW_H} fill={si % 2 === 0 ? '#111' : '#0e0e0e'} />
                {/* Label */}
                <rect x={0} y={rowY} width={LABEL_W} height={ROW_H} fill="#0a0a0a" />
                <text
                  x={LABEL_W - 6} y={rowY + ROW_H / 2 + 4}
                  fontSize={10} fill={sigColor(sig.shortName)} textAnchor="end"
                  fontFamily="monospace" style={{ pointerEvents: 'none' }}
                >
                  {sig.shortName.length > 10 ? sig.shortName.slice(0, 9) + '…' : sig.shortName}
                  {sig.width > 1 && <tspan fontSize={8} fill="#555">[{sig.width - 1}:0]</tspan>}
                </text>
                {/* Waveform */}
                <WaveRow
                  sig={sig} timeline={timeline} maxTime={maxTime}
                  rowY={rowY} timeToX={timeToX} cursorTime={cursorTime} hex={hex}
                />
                {/* Row separator */}
                <line x1={0} y1={rowY + ROW_H} x2="100%" y2={rowY + ROW_H} stroke="#1a1a1a" strokeWidth={0.5} />
              </g>
            );
          })}

          {/* Cursor line */}
          {cursorX !== null && cursorX >= LABEL_W && (
            <line x1={cursorX} y1={PAD_TOP} x2={cursorX} y2={svgH} stroke="#f59e0b" strokeWidth={1} strokeDasharray="3,3" />
          )}

          {/* Label column separator */}
          <line x1={LABEL_W} y1={0} x2={LABEL_W} y2={svgH} stroke="#1e1e1e" strokeWidth={1} />
        </svg>

        {/* Cursor tooltip */}
        {cursorTime !== null && cursorX !== null && cursorX >= LABEL_W && (
          <div style={{
            position: 'absolute', top: 2, left: Math.min(cursorX + 4, (containerRef.current?.clientWidth || 400) - 100),
            background: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: 6,
            padding: '2px 8px', fontSize: 10, color: '#f59e0b', fontFamily: 'monospace',
            pointerEvents: 'none', zIndex: 5,
          }}>
            {cursorTime} {timescale.replace(/\d+/g, '')}
          </div>
        )}
      </div>
    </div>
  );
}
