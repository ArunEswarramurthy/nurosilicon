'use strict';
// Built-in schematic definitions for seeded Verilog problems
// Each node: { id, type, x, y, label, ports:{in:[],out:[]} }
// Each connection: { from:'nodeId.portName', to:'nodeId.portName' }
// Types: input, output, and, or, not, nand, nor, xor, xnor, mux, dff, tff, reg, buf, label

const SCHEMATICS = {

  'NAND Gate': {
    version: 1, type: 'gate', title: 'NAND Gate',
    nodes: [
      { id:'a',    type:'input',  x:60,  y:80,  label:'a' },
      { id:'b',    type:'input',  x:60,  y:140, label:'b' },
      { id:'g1',   type:'nand',   x:200, y:110, label:'NAND' },
      { id:'y',    type:'output', x:360, y:110, label:'y' },
    ],
    connections: [
      { from:'a.out',  to:'g1.in0' },
      { from:'b.out',  to:'g1.in1' },
      { from:'g1.out', to:'y.in' },
    ],
  },

  '4-to-1 Multiplexer': {
    version: 1, type: 'mux', title: '4-to-1 Multiplexer',
    nodes: [
      { id:'d0',  type:'input',  x:60,  y:60,  label:'d0' },
      { id:'d1',  type:'input',  x:60,  y:110, label:'d1' },
      { id:'d2',  type:'input',  x:60,  y:160, label:'d2' },
      { id:'d3',  type:'input',  x:60,  y:210, label:'d3' },
      { id:'s0',  type:'input',  x:60,  y:280, label:'sel[0]' },
      { id:'s1',  type:'input',  x:60,  y:320, label:'sel[1]' },
      { id:'mux', type:'mux4',   x:220, y:140, label:'4:1 MUX' },
      { id:'y',   type:'output', x:380, y:190, label:'y' },
    ],
    connections: [
      { from:'d0.out',  to:'mux.d0' },
      { from:'d1.out',  to:'mux.d1' },
      { from:'d2.out',  to:'mux.d2' },
      { from:'d3.out',  to:'mux.d3' },
      { from:'s0.out',  to:'mux.s0' },
      { from:'s1.out',  to:'mux.s1' },
      { from:'mux.out', to:'y.in' },
    ],
  },

  'Full Adder': {
    version: 1, type: 'gate', title: 'Full Adder',
    nodes: [
      { id:'a',    type:'input',  x:60,  y:60,  label:'a' },
      { id:'b',    type:'input',  x:60,  y:120, label:'b' },
      { id:'cin',  type:'input',  x:60,  y:180, label:'cin' },
      { id:'x1',   type:'xor',   x:200, y:80,  label:'XOR' },
      { id:'x2',   type:'xor',   x:320, y:100, label:'XOR' },
      { id:'a1',   type:'and',   x:200, y:160, label:'AND' },
      { id:'a2',   type:'and',   x:320, y:200, label:'AND' },
      { id:'o1',   type:'or',    x:440, y:180, label:'OR' },
      { id:'sum',  type:'output', x:560, y:100, label:'sum' },
      { id:'cout', type:'output', x:560, y:200, label:'cout' },
    ],
    connections: [
      { from:'a.out',   to:'x1.in0' },
      { from:'b.out',   to:'x1.in1' },
      { from:'a.out',   to:'a1.in0' },
      { from:'b.out',   to:'a1.in1' },
      { from:'x1.out',  to:'x2.in0' },
      { from:'cin.out', to:'x2.in1' },
      { from:'x1.out',  to:'a2.in0' },
      { from:'cin.out', to:'a2.in1' },
      { from:'a1.out',  to:'o1.in0' },
      { from:'a2.out',  to:'o1.in1' },
      { from:'x2.out',  to:'sum.in' },
      { from:'o1.out',  to:'cout.in' },
    ],
  },

  '3-to-8 Decoder': {
    version: 1, type: 'decoder', title: '3-to-8 Decoder',
    nodes: [
      { id:'s0',  type:'input',  x:60,  y:80,  label:'sel[0]' },
      { id:'s1',  type:'input',  x:60,  y:140, label:'sel[1]' },
      { id:'s2',  type:'input',  x:60,  y:200, label:'sel[2]' },
      { id:'dec', type:'dec3x8', x:220, y:120, label:'3:8 DEC' },
      { id:'o0',  type:'output', x:400, y:60,  label:'out[0]' },
      { id:'o1',  type:'output', x:400, y:100, label:'out[1]' },
      { id:'o2',  type:'output', x:400, y:140, label:'out[2]' },
      { id:'o3',  type:'output', x:400, y:180, label:'out[3]' },
      { id:'o4',  type:'output', x:400, y:220, label:'out[4]' },
      { id:'o5',  type:'output', x:400, y:260, label:'out[5]' },
      { id:'o6',  type:'output', x:400, y:300, label:'out[6]' },
      { id:'o7',  type:'output', x:400, y:340, label:'out[7]' },
    ],
    connections: [
      { from:'s0.out',   to:'dec.s0' },
      { from:'s1.out',   to:'dec.s1' },
      { from:'s2.out',   to:'dec.s2' },
      { from:'dec.out0', to:'o0.in' },
      { from:'dec.out1', to:'o1.in' },
      { from:'dec.out2', to:'o2.in' },
      { from:'dec.out3', to:'o3.in' },
      { from:'dec.out4', to:'o4.in' },
      { from:'dec.out5', to:'o5.in' },
      { from:'dec.out6', to:'o6.in' },
      { from:'dec.out7', to:'o7.in' },
    ],
  },

  'T Flip-Flop': {
    version: 1, type: 'sequential', title: 'T Flip-Flop',
    nodes: [
      { id:'clk', type:'clock',  x:60,  y:80,  label:'clk' },
      { id:'rst', type:'input',  x:60,  y:140, label:'rst' },
      { id:'t',   type:'input',  x:60,  y:200, label:'t' },
      { id:'tff', type:'tff',    x:220, y:130, label:'T-FF' },
      { id:'q',   type:'output', x:400, y:130, label:'q' },
    ],
    connections: [
      { from:'clk.out', to:'tff.clk' },
      { from:'rst.out', to:'tff.rst' },
      { from:'t.out',   to:'tff.t' },
      { from:'tff.q',   to:'q.in' },
    ],
  },

  '4-bit Shift Register (SISO)': {
    version: 1, type: 'sequential', title: '4-bit Shift Register',
    nodes: [
      { id:'clk',  type:'clock',  x:60,  y:60,  label:'clk' },
      { id:'rst',  type:'input',  x:60,  y:120, label:'rst' },
      { id:'din',  type:'input',  x:60,  y:180, label:'din' },
      { id:'ff0',  type:'dff',    x:200, y:140, label:'D-FF 0' },
      { id:'ff1',  type:'dff',    x:310, y:140, label:'D-FF 1' },
      { id:'ff2',  type:'dff',    x:420, y:140, label:'D-FF 2' },
      { id:'ff3',  type:'dff',    x:530, y:140, label:'D-FF 3' },
      { id:'dout', type:'output', x:660, y:140, label:'dout' },
    ],
    connections: [
      { from:'din.out',  to:'ff0.d' },
      { from:'clk.out',  to:'ff0.clk' },
      { from:'rst.out',  to:'ff0.rst' },
      { from:'ff0.q',    to:'ff1.d' },
      { from:'clk.out',  to:'ff1.clk' },
      { from:'rst.out',  to:'ff1.rst' },
      { from:'ff1.q',    to:'ff2.d' },
      { from:'clk.out',  to:'ff2.clk' },
      { from:'rst.out',  to:'ff2.rst' },
      { from:'ff2.q',    to:'ff3.d' },
      { from:'clk.out',  to:'ff3.clk' },
      { from:'rst.out',  to:'ff3.rst' },
      { from:'ff3.q',    to:'dout.in' },
    ],
  },

  '3-bit Up/Down Counter': {
    version: 1, type: 'sequential', title: '3-bit Up/Down Counter',
    nodes: [
      { id:'clk',   type:'clock',  x:60,  y:80,  label:'clk' },
      { id:'rst',   type:'input',  x:60,  y:140, label:'rst' },
      { id:'up',    type:'input',  x:60,  y:200, label:'up' },
      { id:'cnt',   type:'reg3',   x:220, y:140, label:'3-bit Counter' },
      { id:'count', type:'output', x:420, y:140, label:'count[2:0]' },
    ],
    connections: [
      { from:'clk.out',  to:'cnt.clk' },
      { from:'rst.out',  to:'cnt.rst' },
      { from:'up.out',   to:'cnt.up' },
      { from:'cnt.out',  to:'count.in' },
    ],
  },

  'Traffic Light FSM (Moore)': {
    version: 1, type: 'fsm', title: 'Traffic Light FSM',
    states: [
      { id:'RED',    x:160, y:80,  label:'RED',    output:'light=00', color:'#ef4444' },
      { id:'GREEN',  x:360, y:80,  label:'GREEN',  output:'light=01', color:'#10b981' },
      { id:'YELLOW', x:260, y:220, label:'YELLOW', output:'light=10', color:'#f59e0b' },
    ],
    transitions: [
      { from:'RED',    to:'GREEN',  label:'clk↑' },
      { from:'GREEN',  to:'YELLOW', label:'clk↑' },
      { from:'YELLOW', to:'RED',    label:'clk↑' },
    ],
    reset: { to:'RED', label:'rst=1' },
    nodes: [
      { id:'clk', type:'clock', x:60, y:160, label:'clk' },
      { id:'rst', type:'input', x:60, y:220, label:'rst' },
      { id:'out', type:'output', x:500, y:160, label:'light[1:0]' },
    ],
  },

  'Sequence Detector: 1011 (Mealy FSM)': {
    version: 1, type: 'fsm', title: 'Sequence Detector 1011',
    states: [
      { id:'S0', x:100, y:160, label:'S0', output:'', color:'#6366f1' },
      { id:'S1', x:260, y:80,  label:'S1', output:'', color:'#6366f1' },
      { id:'S2', x:420, y:160, label:'S2', output:'', color:'#6366f1' },
      { id:'S3', x:260, y:240, label:'S3', output:'', color:'#6366f1' },
    ],
    transitions: [
      { from:'S0', to:'S1', label:'din=1' },
      { from:'S0', to:'S0', label:'din=0' },
      { from:'S1', to:'S2', label:'din=0' },
      { from:'S1', to:'S1', label:'din=1' },
      { from:'S2', to:'S3', label:'din=1' },
      { from:'S2', to:'S0', label:'din=0' },
      { from:'S3', to:'S1', label:'din=1 / det=1' },
      { from:'S3', to:'S0', label:'din=0' },
    ],
    reset: { to:'S0', label:'rst=1' },
    nodes: [
      { id:'clk', type:'clock', x:40, y:80,  label:'clk' },
      { id:'rst', type:'input', x:40, y:140, label:'rst' },
      { id:'din', type:'input', x:40, y:200, label:'din' },
      { id:'det', type:'output', x:560, y:160, label:'det' },
    ],
  },

  '8-bit Parity Generator & Checker': {
    version: 1, type: 'gate', title: '8-bit Parity Gen/Check',
    nodes: [
      { id:'data', type:'input',  x:60,  y:160, label:'data[7:0]' },
      { id:'pin',  type:'input',  x:60,  y:260, label:'parity_in' },
      { id:'xr',   type:'xor8',   x:220, y:140, label:'XOR-8 Tree' },
      { id:'xrc',  type:'xor',    x:380, y:220, label:'XOR' },
      { id:'pout', type:'output', x:540, y:140, label:'parity_out' },
      { id:'err',  type:'output', x:540, y:240, label:'error' },
    ],
    connections: [
      { from:'data.out', to:'xr.in' },
      { from:'xr.out',   to:'pout.in' },
      { from:'xr.out',   to:'xrc.in0' },
      { from:'pin.out',  to:'xrc.in1' },
      { from:'xrc.out',  to:'err.in' },
    ],
  },
};

module.exports = SCHEMATICS;
