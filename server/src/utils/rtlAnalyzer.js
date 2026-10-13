'use strict';
/**
 * rtlAnalyzer.js — NuroSilicon RTL static analysis engine.
 *
 * Supported constructs:
 *   - module declaration with ANSI and non-ANSI port lists
 *   - input/output/inout port declarations (scalar and vector)
 *   - wire/reg declarations
 *   - assign statements (combinational logic)
 *   - always @(*) / always @(posedge clk) blocks
 *   - gate primitives: and, or, not, nand, nor, xor, xnor, buf
 *   - module instantiations
 *   - parameter/localparam declarations
 *   - FSM state-transition extraction from case blocks
 *   - Sequential state-transition table generation
 */

// ── Comment stripper ──────────────────────────────────────────────────────────

function stripComments(src) {
  src = src.replace(/\/\/[^\n]*/g, ' ');
  src = src.replace(/\/\*[\s\S]*?\*\//g, ' ');
  return src;
}

// ── Port / signal helpers ─────────────────────────────────────────────────────

function parseWidth(widthStr) {
  if (!widthStr) return 1;
  // Numeric: [7:0] -> 8
  const m = widthStr.match(/\[(\d+)\s*:\s*(\d+)\]/);
  if (m) return Math.abs(parseInt(m[1]) - parseInt(m[2])) + 1;
  // Parameterized: [WIDTH-1:0] -> return 1 as placeholder (width unknown statically)
  if (/\[/.test(widthStr)) return 1;
  return 1;
}

function parsePortDecls(src) {
  const ports = {};

  // 1. Standalone port declarations (module body): input [w] a, b;
  const re = /\b(input|output|inout)\s+(?:wire\s+|reg\s+)?(\[[^\]]+\])?\s*([\w\s,]+?)\s*;/g;
  let m;
  while ((m = re.exec(src)) !== null) {
    const dir   = m[1];
    const width = parseWidth(m[2]);
    const names = m[3].split(',').map(s => s.trim()).filter(Boolean);
    for (const name of names) {
      if (/^\w+$/.test(name)) ports[name] = { dir, width };
    }
  }

  // 2. ANSI port list: module foo(input clk, rst, input [3:0] data, output y);
  //    Tokenise the port list, tracking the current direction and width across commas.
  // Match module port list, skipping optional #(...) parameter list
  // module foo #(param) (ports) or module foo(ports)
  const modHeaderM = src.match(/\bmodule\s+\w+\s*(?:#\s*\([^)]*\)\s*)?\(([^)]+)\)/);
  const modHeader = modHeaderM ? [modHeaderM[0], modHeaderM[1]] : null;
  if (modHeader) {
    const portList = modHeader[1];
    let curDir = null;
    let curWidth = 1;
    // Split on commas, then process each token
    const tokens = portList.split(',');
    for (const token of tokens) {
      const t = token.trim();
      // Check if this token starts a new direction
      const dirM = t.match(/^(input|output|inout)\s+(?:wire\s+|reg\s+)?(\[[^\]]+\])?\s*(\w+)?/);
      if (dirM) {
        curDir   = dirM[1];
        curWidth = parseWidth(dirM[2]);
        const name = dirM[3] ? dirM[3].trim() : null;
        if (name && /^\w+$/.test(name) && curDir) {
          ports[name] = { dir: curDir, width: curWidth };
        }
      } else if (curDir) {
        // Continuation: just a name (or name with width override)
        const widthM = t.match(/(\[[^\]]+\])?\s*(\w+)$/);
        if (widthM) {
          const w    = widthM[1] ? parseWidth(widthM[1]) : curWidth;
          const name = widthM[2] ? widthM[2].trim() : null;
          if (name && /^\w+$/.test(name)) {
            ports[name] = { dir: curDir, width: w };
          }
        }
      }
    }
  }

  return ports;
}

function parseWireRegs(src) {
  const signals = {};
  const re = /\b(wire|reg)\s+(?:signed\s+)?(\[[^\]]+\])?\s*([\w\s,]+?)\s*;/g;
  let m;
  while ((m = re.exec(src)) !== null) {
    const kind  = m[1];
    const width = parseWidth(m[2]);
    const names = m[3].split(',').map(s => s.trim()).filter(Boolean);
    for (const name of names) {
      if (/^\w+$/.test(name)) signals[name] = { kind, width };
    }
  }
  return signals;
}

// ── Expression classifier ─────────────────────────────────────────────────────

function classifyExpr(expr) {
  expr = expr.trim();
  let depth = 0, stripped = expr;
  if (expr[0] === '(') {
    let i = 0;
    for (; i < expr.length; i++) {
      if (expr[i] === '(') depth++;
      else if (expr[i] === ')') { depth--; if (depth === 0) break; }
    }
    if (i === expr.length - 1) stripped = expr.slice(1, -1).trim();
  }
  if (stripped.startsWith('~') || stripped.startsWith('!')) {
    return { op: 'not', operands: [stripped.slice(1).trim()] };
  }
  if (/^\^/.test(stripped)) {
    return { op: 'xor_reduce', operands: [stripped.slice(1).trim()] };
  }
  const ops = [
    { sym: '|',  op: 'or'  },
    { sym: '^',  op: 'xor' },
    { sym: '&',  op: 'and' },
  ];
  for (const { sym, op } of ops) {
    const idx = findBinaryOp(stripped, sym);
    if (idx !== -1) {
      return { op, operands: [stripped.slice(0, idx).trim(), stripped.slice(idx + 1).trim()] };
    }
  }
  const xnorIdx = findBinaryOp(stripped, '~^');
  if (xnorIdx !== -1) {
    return { op: 'xnor', operands: [stripped.slice(0, xnorIdx).trim(), stripped.slice(xnorIdx + 2).trim()] };
  }
  return { op: 'wire', operands: [stripped] };
}

function findBinaryOp(expr, sym) {
  let depth = 0;
  for (let i = expr.length - 1; i >= sym.length - 1; i--) {
    const c = expr[i];
    if (c === ')') depth++;
    else if (c === '(') depth--;
    if (depth === 0) {
      if (expr.slice(i - sym.length + 1, i + 1) === sym) {
        if (sym === '^' && i > 0 && expr[i - 1] === '~') continue;
        return i - sym.length + 1;
      }
    }
  }
  return -1;
}

// ── Assign parser ─────────────────────────────────────────────────────────────

function parseAssigns(src) {
  const assigns = [];
  const re = /\bassign\s+([\w[\]:]+)\s*=\s*([^;]+);/g;
  let m;
  while ((m = re.exec(src)) !== null) {
    assigns.push({ lhs: m[1].trim(), rhs: m[2].trim() });
  }
  return assigns;
}

// ── Always block detector ─────────────────────────────────────────────────────

function detectAlwaysBlocks(src) {
  const blocks = [];
  const re = /\balways\s*@\s*\(([^)]*)\)/g;
  let m;
  while ((m = re.exec(src)) !== null) {
    const sens = m[1].trim().toLowerCase();
    const isSeq = /posedge|negedge/.test(sens);
    const clkM  = m[1].match(/(?:posedge|negedge)\s+(\w+)/i);
    const rstM  = m[1].match(/(?:posedge|negedge)\s+\w+[^)]*(?:posedge|negedge)\s+(\w+)/i);
    blocks.push({
      type: isSeq ? 'sequential' : 'combinational',
      clock: clkM ? clkM[1] : null,
      reset: rstM ? rstM[1] : null,
      sensitivity: sens,
    });
  }
  return blocks;
}

// ── Gate primitive parser ─────────────────────────────────────────────────────

function parseGatePrimitives(src) {
  const gates = [];
  const GATE_TYPES = ['and','or','not','nand','nor','xor','xnor','buf'];
  for (const gtype of GATE_TYPES) {
    const re = new RegExp(`\\b${gtype}\\s+(?:\\w+\\s+)?\\(([^)]+)\\)\\s*;`, 'g');
    let m;
    while ((m = re.exec(src)) !== null) {
      const ports = m[1].split(',').map(s => s.trim());
      gates.push({ type: gtype, output: ports[0], inputs: ports.slice(1) });
    }
  }
  return gates;
}

// ── Module instantiation parser ───────────────────────────────────────────────

function parseInstantiations(src, topModuleName) {
  const insts = [];
  const re = /\b(\w+)\s+(?:#\s*\([^)]*\)\s+)?(\w+)\s*\(([^;]*)\)\s*;/g;
  const KEYWORDS = new Set([
    'module','endmodule','input','output','inout','wire','reg','assign',
    'always','initial','begin','end','if','else','case','endcase','for',
    'parameter','localparam','function','task','integer','genvar',
    'and','or','not','nand','nor','xor','xnor','buf',
  ]);
  let m;
  while ((m = re.exec(src)) !== null) {
    const modName  = m[1];
    const instName = m[2];
    if (KEYWORDS.has(modName) || modName === topModuleName) continue;
    const portStr = m[3];
    const portRe  = /\.(\w+)\s*\(\s*([\w[\]:]*)\s*\)/g;
    const portMap = {};
    let pm;
    while ((pm = portRe.exec(portStr)) !== null) {
      portMap[pm[1]] = pm[2];
    }
    insts.push({ modName, instName, portMap });
  }
  return insts;
}

// ── FSM detector ──────────────────────────────────────────────────────────────

function detectFSM(src) {
  const stateRe = /\breg\s+\[\s*\d+\s*:\s*\d+\s*\]\s+(state|next_state|current_state|cs|ns)\b/i;
  if (!stateRe.test(src)) return null;

  const stateNames = [];
  const seen = new Set();

  // Match full localparam/parameter lines, then extract all name=value pairs
  // Handles both:
  //   localparam RED=0, GREEN=1, YELLOW=2;
  //   localparam RED = 2'b00;
  //   parameter S0=0; parameter S1=1;
  const lineRe = /(?:parameter|localparam)\s+(?:integer\s+)?([^;]+);/g;
  let lm;
  while ((lm = lineRe.exec(src)) !== null) {
    const body = lm[1];
    // Extract each name=value pair from the body
    const pairRe = /([A-Za-z_]\w*)\s*=\s*([0-9]+'[bBhHdD][0-9a-fA-FxXzZ_]+|\d+)/g;
    let pm;
    while ((pm = pairRe.exec(body)) !== null) {
      const name = pm[1];
      if (!seen.has(name)) {
        seen.add(name);
        stateNames.push({ name, val: pm[2] });
      }
    }
  }

  return { hasStateMachine: true, stateNames };
}

// ── Layout engine ─────────────────────────────────────────────────────────────

function autoLayout(nodes) {
  const inputs  = nodes.filter(n => n.type === 'input' || n.type === 'clock');
  const outputs = nodes.filter(n => n.type === 'output');
  const gates   = nodes.filter(n => !['input','output','clock'].includes(n.type));
  const YGAP = 60, XGAP = 160;
  let y = 60;
  for (const n of inputs)  { n.x = 40;  n.y = y; y += YGAP; }
  y = 60;
  for (const n of outputs) { n.x = 40 + XGAP * (gates.length > 0 ? 2 : 1); n.y = y; y += YGAP; }
  const depths = computeDepths(nodes, gates);
  const cols = {};
  for (const n of gates) {
    const d = depths[n.id] || 1;
    if (!cols[d]) cols[d] = [];
    cols[d].push(n);
  }
  for (const [d, col] of Object.entries(cols)) {
    let cy = 60;
    for (const n of col) {
      n.x = 40 + XGAP * parseInt(d);
      n.y = cy;
      cy += YGAP;
    }
  }
  return nodes;
}

function computeDepths(allNodes, gates) {
  const nodeMap = {};
  for (const n of allNodes) nodeMap[n.id] = n;
  const depths = {};
  function depth(id) {
    if (depths[id] !== undefined) return depths[id];
    depths[id] = 0;
    const n = nodeMap[id];
    if (!n) return 0;
    if (n.type === 'input' || n.type === 'clock') return 0;
    return depths[id];
  }
  for (const g of gates) depth(g.id);
  return depths;
}

// ── Extract always block bodies ─────────────────────────────────────────────
// Returns array of { sensitivity, body } for each always block.
// Handles begin...end nesting correctly.
function extractAlwaysBodies(src) {
  const results = [];
  const alwaysRe = /\balways\s*@\s*\(([^)]*)\)\s*/g;
  let m;
  while ((m = alwaysRe.exec(src)) !== null) {
    const sensitivity = m[1].trim();
    let pos = m.index + m[0].length;
    // Skip optional 'begin'
    const rest = src.slice(pos);
    let body = '';
    if (rest.trimStart().startsWith('begin')) {
      // Count begin/end depth
      let depth = 0;
      let i = pos;
      while (i < src.length) {
        if (src.slice(i, i + 5) === 'begin') { depth++; i += 5; continue; }
        if (src.slice(i, i + 3) === 'end' && !/\w/.test(src[i + 3] || '')) {
          depth--;
          if (depth === 0) { body = src.slice(pos, i + 3); i += 3; break; }
          i += 3; continue;
        }
        i++;
      }
    } else {
      // Single statement — could be case...endcase (no begin/end) or a simple statement
      const restTrimmed2 = src.slice(pos).trimStart();
      if (restTrimmed2.startsWith('case')) {
        const caseStart2 = src.indexOf('case', pos);
        const endcaseIdx2 = src.indexOf('endcase', caseStart2);
        body = endcaseIdx2 !== -1 ? src.slice(pos, endcaseIdx2 + 7) : src.slice(pos);
      } else {
        const semi = src.indexOf(';', pos);
        body = semi !== -1 ? src.slice(pos, semi + 1) : src.slice(pos);
      }
    }
    results.push({ sensitivity, body });
  }
  return results;
}

function extractAlwaysLHS(src) {
  const lhsSet = new Set();
  const SKIP = new Set(['if','else','case','casez','casex','begin','end','default',
    'module','endmodule','always','assign','localparam','parameter','reg','wire',
    'input','output','inout','integer','genvar','function','task']);
  // Non-blocking assignments (sequential always): signal <= ...
  const re1 = /\b(\w+)\s*(?:\[\s*[^\]]*\])?\s*<=/g;
  let m;
  while ((m = re1.exec(src)) !== null) {
    if (!SKIP.has(m[1])) lhsSet.add(m[1]);
  }
  // Blocking assignments inside combinational always @(*) blocks: signal = ...
  const bodies = extractAlwaysBodies(src);
  for (const blk of bodies) {
    if (/posedge|negedge/i.test(blk.sensitivity)) continue;
    const re2 = /\b(\w+)\s*(?:\[\s*[^\]]*\])?\s*=[^=]/g;
    while ((m = re2.exec(blk.body)) !== null) {
      if (!SKIP.has(m[1])) lhsSet.add(m[1]);
    }
  }
  return lhsSet;
}
// ── Main analysis entry point ─────────────────────────────────────────────────

function analyzeRTL(sourceCode) {
  try {
    const src = stripComments(sourceCode);
    const modMatch = src.match(/\bmodule\s+(\w+)\s*(?:#[^;]*?)?\s*\(/);
    if (!modMatch) return { error: 'No module declaration found', nodes: [], connections: [] };
    const moduleName = modMatch[1];

    const ports        = parsePortDecls(src);
    const signals      = parseWireRegs(src);
    const assigns      = parseAssigns(src);
    const alwaysBlocks = detectAlwaysBlocks(src);
    const gatePrims    = parseGatePrimitives(src);
    const insts        = parseInstantiations(src, moduleName);
    const fsmInfo      = detectFSM(src);
    const alwaysLHS    = extractAlwaysLHS(src);

    const isSequential = alwaysBlocks.some(b => b.type === 'sequential');
    const isFSM        = !!fsmInfo?.hasStateMachine;

    const nodes   = [];
    const nodeMap = {};
    let idCounter = 0;
    const mkId = (prefix) => `${prefix}_${idCounter++}`;

    // Port nodes — use stable port_NAME IDs
    for (const [name, info] of Object.entries(ports)) {
      const isClk = /^clk$|^clock$/i.test(name);
      const type  = info.dir === 'input' ? (isClk ? 'clock' : 'input') : 'output';
      const id    = `port_${name}`;
      nodes.push({ id, type, label: info.width > 1 ? `${name}[${info.width-1}:0]` : name, portName: name, width: info.width, x: 0, y: 0 });
      nodeMap[name] = id;
    }

    // Gate primitive nodes
    for (const g of gatePrims) {
      const id = mkId(g.type);
      nodes.push({ id, type: g.type, label: g.type.toUpperCase(), x: 0, y: 0, _output: g.output, _inputs: g.inputs });
      nodeMap[`gate_${g.output}`] = id;
    }

    // Assign-derived gate nodes
    for (const asgn of assigns) {
      const tree = buildGateTree(asgn.rhs, asgn.lhs, nodes, nodeMap, mkId);
      if (tree) nodes.push(...tree);
    }

    // Sub-module instance nodes
    for (const inst of insts) {
      const id = `inst_${inst.instName}`;
      nodes.push({ id, type: 'module', label: `${inst.modName}\n${inst.instName}`, x: 0, y: 0, _portMap: inst.portMap });
      nodeMap[inst.instName] = id;
    }

    // Sequential / FSM register nodes — one DFF per sequential always block
    const seqBlocks = alwaysBlocks.filter(b => b.type === 'sequential' && b.clock);
    for (const blk of seqBlocks) {
      const id = `dff_${blk.clock}`;
      if (!nodeMap[`__dff_${blk.clock}`]) {
        nodes.push({ id, type: 'dff', label: isFSM ? 'State\nReg' : 'REG', clock: blk.clock, reset: blk.reset, x: 0, y: 0 });
        nodeMap[`__dff_${blk.clock}`] = id;
      }
    }

    // FSM structural nodes: Next-State Logic and Output Decoder
    // These represent the two combinational blocks in a Moore FSM.
    // They are added to the node list so the renderer can show the full structure.
    if (isFSM && seqBlocks.length > 0) {
      const hasCombAlways = alwaysBlocks.some(b => b.type === 'combinational');
      // Next-State Logic block
      nodes.push({ id: 'nsl', type: 'nsl', label: 'Next-State\nLogic', x: 0, y: 0 });
      nodeMap['__nsl'] = 'nsl';
      // Output Decoder block (only if there is a combinational always block driving outputs)
      if (hasCombAlways) {
        nodes.push({ id: 'odec', type: 'odec', label: 'Output\nDecoder', x: 0, y: 0 });
        nodeMap['__odec'] = 'odec';
      }
    }

    const connections = buildConnections(nodes, nodeMap, assigns, gatePrims, insts, ports, seqBlocks, alwaysLHS);
    autoLayout(nodes);

    let schType = 'combinational';
    if (isFSM)             schType = 'fsm';
    else if (isSequential) schType = 'sequential';

    let fsmGraph = null;
    if (isFSM && fsmInfo.stateNames.length > 0) {
      fsmGraph = buildFSMGraph(src, fsmInfo.stateNames, ports);
    }

    return {
      moduleName,
      type: schType,
      title: moduleName,
      nodes,
      connections,
      ports,
      signals: [...Object.keys(ports), ...Object.keys(signals)],
      isSequential,
      isFSM,
      fsmStates: fsmInfo?.stateNames || [],
      fsmGraph,
      alwaysBlocks,
      error: null,
    };
  } catch (err) {
    return { error: `RTL analysis failed: ${err.message}`, nodes: [], connections: [] };
  }
}

// ── FSM graph builder ─────────────────────────────────────────────────────────
// Extracts transitions by parsing case blocks in always @(posedge clk) bodies.
// Fixes the old heuristic that produced duplicate/wrong edges.

function buildFSMGraph(src, stateNames, ports) {
  const COLORS = ['#6366f1','#10b981','#f59e0b','#ef4444','#0ea5e9','#a78bfa','#ec4899'];
  const states = stateNames.map((s, i) => ({
    id: s.name, label: s.name,
    x: 80 + Math.cos((i / stateNames.length) * 2 * Math.PI) * 140,
    y: 160 + Math.sin((i / stateNames.length) * 2 * Math.PI) * 120,
    color: COLORS[i % COLORS.length],
  }));

  const stateNameSet = new Set(stateNames.map(s => s.name));

  // Detect reset state from: if (rst/reset) state <= FIRST_STATE
  let resetState = stateNames[0]?.name || null;
  const rstAssignRe = /if\s*\(\s*(?:rst|reset)\s*\)\s*(?:state|current_state|cs)\s*<=\s*(\w+)/i;
  const rstM = src.match(rstAssignRe);
  if (rstM && stateNameSet.has(rstM[1])) resetState = rstM[1];

  const transitions = [];
  const seen = new Set();

  // Use extractAlwaysBodies to correctly handle begin/end nesting
  const bodies = extractAlwaysBodies(src);
  for (const blk of bodies) {
    if (!/posedge|negedge/i.test(blk.sensitivity)) continue;
    const body = blk.body;
    const caseRe = /\bcase\s*\([^)]+\)([\s\S]*?)\bendcase\b/g;
    let caseMatch;
    while ((caseMatch = caseRe.exec(body)) !== null) {
      const caseBody = caseMatch[1];
      const itemRe = /\b(\w+)\s*:/g;
      let itemMatch;
      const items = [];
      while ((itemMatch = itemRe.exec(caseBody)) !== null) {
        if (stateNameSet.has(itemMatch[1])) {
          items.push({ name: itemMatch[1], start: itemMatch.index + itemMatch[0].length });
        }
      }
      for (let i = 0; i < items.length; i++) {
        const itemEnd = i + 1 < items.length
          ? items[i + 1].start - items[i + 1].name.length - 1
          : caseBody.length;
        const itemBody = caseBody.slice(items[i].start, itemEnd);
        const fromState = items[i].name;
        const nextStateRe = /\b(?:state|next_state|current_state|cs|ns)\s*<=\s*(\w+)/g;
        let nsMatch;
        while ((nsMatch = nextStateRe.exec(itemBody)) !== null) {
          const toState = nsMatch[1];
          if (stateNameSet.has(toState)) {
            const key = fromState + '->' + toState;
            if (!seen.has(key)) {
              transitions.push({ from: fromState, to: toState, label: '' });
              seen.add(key);
            }
          }
        }
      }
    }
  }

  const inputPorts  = Object.entries(ports).filter(([, v]) => v.dir === 'input');
  const outputPorts = Object.entries(ports).filter(([, v]) => v.dir === 'output');

  return { states, transitions, resetState, inputPorts, outputPorts };
}

// ── Gate tree builder ─────────────────────────────────────────────────────────

function buildGateTree(rhs, lhsName, nodes, nodeMap, mkId) {
  const newNodes = [];
  const expr = classifyExpr(rhs);
  if (expr.op === 'wire') return newNodes;
  const gateType = expr.op === 'xor_reduce' ? 'xor' : expr.op;
  const id = mkId(gateType);
  newNodes.push({ id, type: gateType, label: gateType.toUpperCase(), x: 0, y: 0, _lhs: lhsName, _operands: expr.operands });
  nodeMap[`assign_${lhsName}`] = id;
  return newNodes;
}

// ── Connection builder ────────────────────────────────────────────────────────
// Fixed: wires FSM/sequential outputs driven by combinational always @(*)
// blocks (Moore output decoder) so light[1:0] is never floating.

function buildConnections(nodes, nodeMap, assigns, gatePrims, insts, ports, seqBlocks, alwaysLHS) {
  const conns = [];
  const added = new Set();

  function addConn(from, to) {
    const key = `${from}\u2192${to}`;
    if (!added.has(key) && from && to && from !== to) {
      added.add(key);
      conns.push({ from, to });
    }
  }

  // Gate primitive connections
  for (const g of gatePrims) {
    const gateId = nodeMap[`gate_${g.output}`];
    if (!gateId) continue;
    const outId = nodeMap[g.output];
    if (outId) addConn(`${gateId}.out`, `${outId}.in`);
    for (let i = 0; i < g.inputs.length; i++) {
      const inpName = g.inputs[i].replace(/\[.*\]/, '');
      const inpId   = nodeMap[inpName];
      if (inpId) addConn(`${inpId}.out`, `${gateId}.in${i}`);
    }
  }

  // Assign connections
  for (const asgn of assigns) {
    const lhsClean  = asgn.lhs.replace(/\[.*\]/, '');
    const gateId    = nodeMap[`assign_${lhsClean}`];
    const outPortId = nodeMap[lhsClean];
    const expr      = classifyExpr(asgn.rhs);
    if (expr.op === 'wire') {
      const srcName = expr.operands[0].replace(/\[.*\]/, '');
      const srcId   = nodeMap[srcName] || nodeMap[`assign_${srcName}`];
      if (srcId && outPortId) addConn(`${srcId}.out`, `${outPortId}.in`);
      continue;
    }
    if (!gateId) continue;
    if (outPortId) addConn(`${gateId}.out`, `${outPortId}.in`);
    for (let i = 0; i < (expr.operands || []).length; i++) {
      const opName = expr.operands[i].replace(/\[.*\]/, '').replace(/^[~!^]+/, '');
      const opId   = nodeMap[opName] || nodeMap[`assign_${opName}`];
      if (opId) addConn(`${opId}.out`, `${gateId}.in${i}`);
    }
  }

  // Sub-module port connections
  for (const inst of insts) {
    const instId = nodeMap[inst.instName];
    if (!instId) continue;
    for (const [portName, sigName] of Object.entries(inst.portMap)) {
      const sigId = nodeMap[sigName] || nodeMap[`assign_${sigName}`];
      if (!sigId) continue;
      if (ports[sigName]?.dir === 'input') {
        addConn(`${sigId}.out`, `${instId}.${portName}`);
      } else {
        addConn(`${instId}.${portName}`, `${sigId}.in`);
      }
    }
  }

  // Sequential / FSM connections
  for (const blk of (seqBlocks || [])) {
    const dffId = nodeMap[`__dff_${blk.clock}`];
    if (!dffId) continue;

    const clkId = nodeMap[blk.clock];
    if (clkId) addConn(`${clkId}.out`, `${dffId}.clk`);

    if (blk.reset) {
      const rstId = nodeMap[blk.reset];
      if (rstId) addConn(`${rstId}.out`, `${dffId}.rst`);
    } else {
      for (const [pname, pinfo] of Object.entries(ports)) {
        if (pinfo.dir === 'input' && /^rst$|^reset$/i.test(pname)) {
          const rstId = nodeMap[pname];
          if (rstId) addConn(`${rstId}.out`, `${dffId}.rst`);
          break;
        }
      }
    }

    // Non-clk, non-rst inputs -> DFF.d
    for (const [pname, pinfo] of Object.entries(ports)) {
      if (pinfo.dir !== 'input') continue;
      if (/^clk$|^clock$/i.test(pname)) continue;
      if (/^rst$|^reset$/i.test(pname)) continue;
      const pId = nodeMap[pname];
      if (pId) addConn(`${pId}.out`, `${dffId}.d`);
    }

    // DFF.q -> output ports that are directly driven by the register
    // (not through a combinational always @(*) decoder — those go via ODEC)
    for (const [pname, pinfo] of Object.entries(ports)) {
      if (pinfo.dir !== 'output') continue;
      // Skip outputs driven by combinational always (they go through ODEC)
      if (alwaysLHS && alwaysLHS.has(pname)) continue;
      const pId = nodeMap[pname];
      if (pId) addConn(`${dffId}.q`, `${pId}.in`);
    }
  }

  // Wire NSL and ODEC structural nodes for FSM designs
  const nslId  = nodeMap['__nsl'];
  const odecId = nodeMap['__odec'];

  if (nslId) {
    const dffNodesNSL = nodes.filter(n => n.type === 'dff');
    for (const dff of dffNodesNSL) {
      addConn(`${dff.id}.q`, `${nslId}.in`);
      addConn(`${nslId}.out`, `${dff.id}.d`);
    }
    for (const [pname, pinfo] of Object.entries(ports)) {
      if (pinfo.dir !== 'input') continue;
      if (/^clk$|^clock$/i.test(pname)) continue;
      if (/^rst$|^reset$/i.test(pname)) continue;
      const pId = nodeMap[pname];
      if (pId) addConn(`${pId}.out`, `${nslId}.in`);
    }
  }

  if (odecId) {
    const dffNodesODEC = nodes.filter(n => n.type === 'dff');
    for (const dff of dffNodesODEC) {
      addConn(`${dff.id}.q`, `${odecId}.in`);
    }
    for (const [pname, pinfo] of Object.entries(ports)) {
      if (pinfo.dir !== 'output') continue;
      if (alwaysLHS && alwaysLHS.has(pname)) {
        const pId = nodeMap[pname];
        if (pId) addConn(`${odecId}.out`, `${pId}.in`);
      }
    }
  } else if (alwaysLHS && alwaysLHS.size > 0) {
    const dffNodesFB = nodes.filter(n => n.type === 'dff');
    for (const dff of dffNodesFB) {
      for (const [pname, pinfo] of Object.entries(ports)) {
        if (pinfo.dir !== 'output') continue;
        if (!alwaysLHS.has(pname)) continue;
        const pId = nodeMap[pname];
        if (pId) addConn(`${dff.id}.q`, `${pId}.in`);
      }
    }
  }

  return conns;
}

// ── Truth table generator ─────────────────────────────────────────────────────
// Only for purely combinational modules (no sequential always blocks).
// For sequential/FSM designs, returns a descriptive error so the frontend
// can show the correct sequential analysis instead.

function generateTruthTable(sourceCode) {
  try {
    const src = stripComments(sourceCode);
    const ports        = parsePortDecls(src);
    const assigns      = parseAssigns(src);
    const alwaysBlocks = detectAlwaysBlocks(src);

    // Detect sequential design — truth table is not meaningful
    const isSequential = alwaysBlocks.some(b => b.type === 'sequential');
    if (isSequential) {
      return {
        error: 'sequential',
        message: 'This is a sequential circuit. Use the Waveform tab to inspect signal behavior over time.',
        rows: [],
        isSequential: true,
      };
    }

    const inputs  = Object.entries(ports).filter(([, v]) => v.dir === 'input');
    const outputs = Object.entries(ports).filter(([, v]) => v.dir === 'output');

    const totalInputBits = inputs.reduce((s, [, v]) => s + v.width, 0);
    if (totalInputBits > 16) {
      return { error: `Too many input bits (${totalInputBits}) for exhaustive truth table. Max 16.`, rows: [] };
    }
    if (inputs.length === 0 || outputs.length === 0) {
      return { error: 'No inputs or outputs found', rows: [] };
    }

    const rows = [];
    const combos = 1 << totalInputBits;

    for (let combo = 0; combo < combos; combo++) {
      const env = {};
      let bit = totalInputBits - 1;
      for (const [name, info] of inputs) {
        let val = 0;
        for (let b = 0; b < info.width; b++) {
          val |= (((combo >> bit) & 1) << (info.width - 1 - b));
          bit--;
        }
        env[name] = val;
      }
      for (const asgn of assigns) {
        const lhs = asgn.lhs.replace(/\[.*\]/, '');
        env[lhs] = evalExpr(asgn.rhs, env);
      }
      const row = {};
      for (const [name, info] of inputs)  row[name] = fmtVal(env[name], info.width);
      for (const [name, info] of outputs) row[name] = fmtVal(env[name] ?? 0, info.width);
      rows.push(row);
    }

    return {
      inputs:  inputs.map(([name, info]) => ({ name, width: info.width })),
      outputs: outputs.map(([name, info]) => ({ name, width: info.width })),
      rows,
      error: null,
      isSequential: false,
    };
  } catch (err) {
    return { error: `Truth table generation failed: ${err.message}`, rows: [] };
  }
}

// ── Sequential state-transition table generator ───────────────────────────────
// Extracts state transitions from FSM case blocks for display in the Truth Table
// tab when the design is sequential. Returns rows suitable for a transition table.

function generateSequentialTable(sourceCode) {
  try {
    const src      = stripComments(sourceCode);
    const ports    = parsePortDecls(src);
    const fsmInfo  = detectFSM(src);

    if (!fsmInfo || !fsmInfo.hasStateMachine || fsmInfo.stateNames.length === 0) {
      return {
        type: 'sequential',
        message: 'Sequential circuit detected. Run the simulation to view signal behavior in the Waveform tab.',
        rows: [],
        headers: [],
      };
    }

    const stateNames   = fsmInfo.stateNames;
    const stateNameSet = new Set(stateNames.map(s => s.name));

    // Build value map: name -> numeric value
    const stateValMap = {};
    for (const s of stateNames) {
      const v = s.val;
      if (/^\d+$/.test(v)) {
        stateValMap[s.name] = parseInt(v, 10);
      } else {
        const bm = v.match(/\d+'[bB]([01]+)/);
        const hm = v.match(/\d+'[hH]([0-9a-fA-F]+)/);
        const dm = v.match(/\d+'[dD](\d+)/);
        if (bm) stateValMap[s.name] = parseInt(bm[1], 2);
        else if (hm) stateValMap[s.name] = parseInt(hm[1], 16);
        else if (dm) stateValMap[s.name] = parseInt(dm[1], 10);
        else stateValMap[s.name] = 0;
      }
    }

    // Detect reset state
    let resetState = stateNames[0]?.name || null;
    const rstM = src.match(/if\s*\(\s*(?:rst|reset)\s*\)\s*(?:state|current_state|cs)\s*<=\s*(\w+)/i);
    if (rstM && stateNameSet.has(rstM[1])) resetState = rstM[1];

    const transitions = []; // { from, to }
    const seen = new Set();

    // Use extractAlwaysBodies to correctly handle begin/end nesting
    const bodies2 = extractAlwaysBodies(src);
    for (const blk of bodies2) {
      if (!/posedge|negedge/i.test(blk.sensitivity)) continue;
      const body = blk.body;
      const caseRe3 = /\bcase\s*\([^)]+\)([\s\S]*?)\bendcase\b/g;
      let caseMatch;
      while ((caseMatch = caseRe3.exec(body)) !== null) {
        const caseBody = caseMatch[1];
        const itemRe3 = /\b(\w+)\s*:/g;
        let itemMatch;
        const items = [];
        while ((itemMatch = itemRe3.exec(caseBody)) !== null) {
          if (stateNameSet.has(itemMatch[1])) {
            items.push({ name: itemMatch[1], start: itemMatch.index + itemMatch[0].length });
          }
        }
        for (let i = 0; i < items.length; i++) {
          const itemEnd = i + 1 < items.length
            ? items[i + 1].start - items[i + 1].name.length - 1
            : caseBody.length;
          const itemBody = caseBody.slice(items[i].start, itemEnd);
          const fromState = items[i].name;
          const nextStateRe3 = /\b(?:state|next_state|current_state|cs|ns)\s*<=\s*(\w+)/g;
          let nsMatch;
          while ((nsMatch = nextStateRe3.exec(itemBody)) !== null) {
            const toState = nsMatch[1];
            if (stateNameSet.has(toState)) {
              const key = fromState + '->' + toState;
              if (!seen.has(key)) {
                transitions.push({ from: fromState, to: toState });
                seen.add(key);
              }
            }
          }
        }
      }
    }

    // Extract output assignments per state from combinational always @(*) blocks
    // Maps: stateName -> { outputPort: value }
    const stateOutputs = {};
    const bodies3 = extractAlwaysBodies(src);
    for (const blk3 of bodies3) {
      if (/posedge|negedge/i.test(blk3.sensitivity)) continue;
      const body = blk3.body;
      const caseRe5 = /\bcase\s*\([^)]+\)([\s\S]*?)\bendcase\b/g;
      let caseMatch;
      while ((caseMatch = caseRe5.exec(body)) !== null) {
        const caseBody = caseMatch[1];
        const itemRe5 = /\b(\w+)\s*:/g;
        let itemMatch;
        const items = [];
        while ((itemMatch = itemRe5.exec(caseBody)) !== null) {
          if (stateNameSet.has(itemMatch[1]) || itemMatch[1] === 'default') {
            items.push({ name: itemMatch[1], start: itemMatch.index + itemMatch[0].length, isDefault: itemMatch[1] === 'default' });
          }
        }
        const stateItems = items.filter(it => !it.isDefault);
        for (let i = 0; i < stateItems.length; i++) {
          // Find the next boundary (next state item OR default)
          const nextBoundaryIdx = items.findIndex(it => it.start > stateItems[i].start);
          const itemEnd = nextBoundaryIdx !== -1
            ? items[nextBoundaryIdx].start - items[nextBoundaryIdx].name.length - 1
            : caseBody.length;
          const itemBody = caseBody.slice(stateItems[i].start, itemEnd);
          const stateName = stateItems[i].name;
          if (!stateOutputs[stateName]) stateOutputs[stateName] = {};
          const assignRe = /\b(\w+)\s*=\s*([^;]+);/g;
          let asgn;
          while ((asgn = assignRe.exec(itemBody)) !== null) {
            const lhs = asgn[1];
            const rhs = asgn[2].trim();
            if (ports[lhs]?.dir === 'output') {
              const bm = rhs.match(/\d+'[bB]([01]+)/);
              const hm = rhs.match(/\d+'[hH]([0-9a-fA-F]+)/);
              const dm = rhs.match(/\d+'[dD](\d+)/);
              const nm = rhs.match(/^(\d+)$/);
              let val = 'x';
              if (bm) val = bm[1];
              else if (hm) val = parseInt(hm[1], 16).toString(2).padStart(ports[lhs].width, '0');
              else if (dm) val = parseInt(dm[1], 10).toString(2).padStart(ports[lhs].width, '0');
              else if (nm) val = parseInt(nm[1], 10).toString(2).padStart(ports[lhs].width, '0');
              stateOutputs[stateName][lhs] = val;
            }
          }
        }
      }
    }

    // Build output port list
    const outputPorts = Object.entries(ports)
      .filter(([, v]) => v.dir === 'output')
      .map(([name, info]) => ({ name, width: info.width }));

    // Build rows: one per transition + reset row
    const rows = [];

    // Reset row
    if (resetState) {
      const row = {
        current_state: resetState,
        condition: 'rst=1',
        next_state: resetState,
        clock_edge: 'posedge clk',
      };
      for (const op of outputPorts) {
        row[op.name] = stateOutputs[resetState]?.[op.name] ?? 'x';
      }
      rows.push(row);
    }

    // Transition rows
    for (const t of transitions) {
      const row = {
        current_state: t.from,
        condition: 'rst=0',
        next_state: t.to,
        clock_edge: 'posedge clk',
      };
      for (const op of outputPorts) {
        row[op.name] = stateOutputs[t.from]?.[op.name] ?? 'x';
      }
      rows.push(row);
    }

    const headers = [
      { key: 'current_state', label: 'Current State' },
      { key: 'condition',     label: 'Condition' },
      { key: 'clock_edge',    label: 'Clock Edge' },
      { key: 'next_state',    label: 'Next State' },
      ...outputPorts.map(op => ({ key: op.name, label: `${op.name}${op.width > 1 ? `[${op.width-1}:0]` : ''}` })),
    ];

    return {
      type: 'fsm',
      stateNames: stateNames.map(s => s.name),
      outputPorts,
      headers,
      rows,
      resetState,
      error: null,
    };
  } catch (err) {
    return { error: `Sequential analysis failed: ${err.message}`, rows: [], headers: [] };
  }
}

// ── Value formatter ───────────────────────────────────────────────────────────

function fmtVal(val, width) {
  if (val === undefined || val === null) return 'x';
  const v = val >>> 0;
  if (width === 1) return String(v & 1);
  return v.toString(2).padStart(width, '0').slice(-width);
}

// ── Expression evaluator ──────────────────────────────────────────────────────

function evalExpr(expr, env) {
  expr = expr.trim();
  // Only strip outer parens if the opening ( at pos 0 is matched by the ) at the end
  if (expr.startsWith('(') && expr.endsWith(')')) {
    let depth = 0;
    let matched = false;
    for (let i = 0; i < expr.length; i++) {
      if (expr[i] === '(') depth++;
      else if (expr[i] === ')') {
        depth--;
        if (depth === 0) { matched = (i === expr.length - 1); break; }
      }
    }
    if (matched) expr = expr.slice(1, -1).trim();
  }
  if (expr.startsWith('~') || expr.startsWith('!')) {
    return (~evalExpr(expr.slice(1), env)) & 0xFFFFFFFF;
  }
  if (expr.startsWith('^')) {
    const v = evalExpr(expr.slice(1), env) >>> 0;
    let p = 0, x = v;
    while (x) { p ^= (x & 1); x >>>= 1; }
    return p;
  }
  for (const [sym, fn] of [
    ['~^', (a, b) => ~(a ^ b)],
    ['^~', (a, b) => ~(a ^ b)],
    ['|',  (a, b) => a | b],
    ['^',  (a, b) => a ^ b],
    ['&',  (a, b) => a & b],
    ['>>>',(a, b) => (a >>> 0) >>> b],
    ['>>', (a, b) => a >> b],
    ['<<', (a, b) => a << b],
  ]) {
    const idx = findBinaryOp(expr, sym);
    if (idx !== -1) {
      const a = evalExpr(expr.slice(0, idx), env);
      const b = evalExpr(expr.slice(idx + sym.length), env);
      return fn(a >>> 0, b >>> 0) >>> 0;
    }
  }
  const bitSel = expr.match(/^(\w+)\[(\d+)\]$/);
  if (bitSel) {
    const v = env[bitSel[1]] ?? 0;
    return (v >>> parseInt(bitSel[2])) & 1;
  }
  const partSel = expr.match(/^(\w+)\[(\d+):(\d+)\]$/);
  if (partSel) {
    const v = env[partSel[1]] ?? 0;
    const h = parseInt(partSel[2]), l = parseInt(partSel[3]);
    const mask = (1 << (h - l + 1)) - 1;
    return (v >>> l) & mask;
  }
  const numM = expr.match(/^(\d+)'([bBoOdDhH])([0-9a-fA-F_xXzZ]+)$/);
  if (numM) {
    const base = numM[2].toLowerCase();
    const digits = numM[3].replace(/_/g, '');
    if (base === 'b') return parseInt(digits.replace(/[xz]/gi, '0'), 2);
    if (base === 'o') return parseInt(digits, 8);
    if (base === 'd') return parseInt(digits, 10);
    if (base === 'h') return parseInt(digits, 16);
  }
  if (/^\d+$/.test(expr)) return parseInt(expr, 10);
  return env[expr] ?? 0;
}

module.exports = { analyzeRTL, generateTruthTable, generateSequentialTable, stripComments };
