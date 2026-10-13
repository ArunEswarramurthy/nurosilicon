'use strict';
/**
 * rtl-extended.test.js
 * Extended regression suite covering:
 *   - FSM transition extraction (fixed heuristic)
 *   - Sequential state-transition table generation
 *   - Combinational truth table still works after rewrite
 *   - FSM output wiring (Moore decoder)
 *   - generateSequentialTable for Traffic Light FSM
 *   - Binary-to-Gray WIDTH=4 and WIDTH=8 via live iverilog
 *   - Parity generator/checker
 *   - Schematic graph validation (no dangling wires)
 */

const {
  analyzeRTL,
  generateTruthTable,
  generateSequentialTable,
} = require('../utils/rtlAnalyzer');
const { runVerilog, checkIverilog } = require('../utils/verilogSandbox');

const TIMEOUT = 20000;

const TRAFFIC_LIGHT_SRC = `
module traffic_light(input clk, input rst, output reg [1:0] light);
  reg [1:0] state;
  localparam RED=0, GREEN=1, YELLOW=2;
  always @(posedge clk) begin
    if (rst) state <= RED;
    else case(state)
      RED:    state <= GREEN;
      GREEN:  state <= YELLOW;
      YELLOW: state <= RED;
    endcase
  end
  always @(*) begin
    case(state)
      RED:    light = 2'b00;
      GREEN:  light = 2'b01;
      YELLOW: light = 2'b10;
      default: light = 2'b00;
    endcase
  end
endmodule`;

const TRAFFIC_LIGHT_TB = `
module tb;
  reg clk, rst; wire [1:0] light;
  traffic_light uut(.clk(clk),.rst(rst),.light(light));
  initial clk=0; always #5 clk=~clk;
  initial begin
    $dumpfile("dump.vcd"); $dumpvars(0,tb);
    rst=1;#12; rst=0;
    if(light===2'b00) $display("PASS: reset=RED"); else $display("FAIL: reset | expected=00 got=%02b",light);
    #10; if(light===2'b01) $display("PASS: RED->GREEN"); else $display("FAIL: RED->GREEN | expected=01 got=%02b",light);
    #10; if(light===2'b10) $display("PASS: GREEN->YELLOW"); else $display("FAIL: GREEN->YELLOW | expected=10 got=%02b",light);
    #10; if(light===2'b00) $display("PASS: YELLOW->RED"); else $display("FAIL: YELLOW->RED | expected=00 got=%02b",light);
    $finish;
  end
endmodule`;

// ── Group F: FSM transition extraction ───────────────────────────────────────
describe('Group F — FSM transition extraction', () => {

  test('Traffic Light: analyzeRTL detects 3 states', () => {
    const r = analyzeRTL(TRAFFIC_LIGHT_SRC);
    expect(r.error).toBeNull();
    expect(r.isFSM).toBe(true);
    expect(r.fsmStates.length).toBe(3);
    const names = r.fsmStates.map(s => s.name);
    expect(names).toContain('RED');
    expect(names).toContain('GREEN');
    expect(names).toContain('YELLOW');
  });

  test('Traffic Light: fsmGraph has exactly 3 transitions (no duplicates)', () => {
    const r = analyzeRTL(TRAFFIC_LIGHT_SRC);
    expect(r.fsmGraph).toBeTruthy();
    const { transitions } = r.fsmGraph;
    // RED->GREEN, GREEN->YELLOW, YELLOW->RED
    expect(transitions.length).toBe(3);
    const keys = transitions.map(t => `${t.from}->${t.to}`);
    expect(keys).toContain('RED->GREEN');
    expect(keys).toContain('GREEN->YELLOW');
    expect(keys).toContain('YELLOW->RED');
    // No duplicates
    const unique = new Set(keys);
    expect(unique.size).toBe(3);
  });

  test('Traffic Light: fsmGraph resetState is RED', () => {
    const r = analyzeRTL(TRAFFIC_LIGHT_SRC);
    expect(r.fsmGraph.resetState).toBe('RED');
  });

  test('Traffic Light: output port light is in fsmGraph outputPorts', () => {
    const r = analyzeRTL(TRAFFIC_LIGHT_SRC);
    const outNames = r.fsmGraph.outputPorts.map(([name]) => name);
    expect(outNames).toContain('light');
  });

  test('Traffic Light: output light is connected via ODEC or DFF (no floating output)', () => {
    const r = analyzeRTL(TRAFFIC_LIGHT_SRC);
    const lightPortId = `port_light`;
    // With ODEC: odec.out -> port_light.in
    const viaODEC = r.connections.find(
      c => c.from === 'odec.out' && c.to === `${lightPortId}.in`
    );
    // Without ODEC (fallback): dff.q -> port_light.in
    const dffNode = r.nodes.find(n => n.type === 'dff');
    const viaDFF  = dffNode && r.connections.find(
      c => c.from === `${dffNode.id}.q` && c.to === `${lightPortId}.in`
    );
    expect(viaODEC || viaDFF).toBeTruthy();
  });

  test('Mealy FSM: transitions extracted correctly', () => {
    const src = `
module seq_det(input clk, input rst, input din, output reg det);
  reg [1:0] state;
  localparam S0=0, S1=1, S2=2, S3=3;
  always @(posedge clk) begin
    if (rst) state <= S0;
    else case(state)
      S0: state <= din ? S1 : S0;
      S1: state <= din ? S1 : S2;
      S2: state <= din ? S3 : S0;
      S3: state <= din ? S1 : S2;
    endcase
  end
  always @(*) det = (state == S3) && din;
endmodule`;
    const r = analyzeRTL(src);
    expect(r.isFSM).toBe(true);
    expect(r.fsmStates.length).toBe(4);
  });

});

// ── Group G: Sequential state-transition table ────────────────────────────────
describe('Group G — Sequential state-transition table', () => {

  test('Traffic Light: generateSequentialTable returns FSM type', () => {
    const t = generateSequentialTable(TRAFFIC_LIGHT_SRC);
    expect(t.error).toBeNull();
    expect(t.type).toBe('fsm');
  });

  test('Traffic Light: table has reset row + 3 transition rows', () => {
    const t = generateSequentialTable(TRAFFIC_LIGHT_SRC);
    // reset row (RED->RED on rst=1) + RED->GREEN + GREEN->YELLOW + YELLOW->RED
    expect(t.rows.length).toBe(4);
  });

  test('Traffic Light: reset row has current_state=RED, next_state=RED', () => {
    const t = generateSequentialTable(TRAFFIC_LIGHT_SRC);
    const resetRow = t.rows.find(r => r.condition === 'rst=1');
    expect(resetRow).toBeTruthy();
    expect(resetRow.current_state).toBe('RED');
    expect(resetRow.next_state).toBe('RED');
  });

  test('Traffic Light: RED->GREEN row has light=00 (RED output)', () => {
    const t = generateSequentialTable(TRAFFIC_LIGHT_SRC);
    const row = t.rows.find(r => r.current_state === 'RED' && r.next_state === 'GREEN');
    expect(row).toBeTruthy();
    expect(row.light).toBe('00');
  });

  test('Traffic Light: GREEN->YELLOW row has light=01 (GREEN output)', () => {
    const t = generateSequentialTable(TRAFFIC_LIGHT_SRC);
    const row = t.rows.find(r => r.current_state === 'GREEN' && r.next_state === 'YELLOW');
    expect(row).toBeTruthy();
    expect(row.light).toBe('01');
  });

  test('Traffic Light: YELLOW->RED row has light=10 (YELLOW output)', () => {
    const t = generateSequentialTable(TRAFFIC_LIGHT_SRC);
    const row = t.rows.find(r => r.current_state === 'YELLOW' && r.next_state === 'RED');
    expect(row).toBeTruthy();
    expect(row.light).toBe('10');
  });

  test('Traffic Light: headers include current_state, next_state, light', () => {
    const t = generateSequentialTable(TRAFFIC_LIGHT_SRC);
    const keys = t.headers.map(h => h.key);
    expect(keys).toContain('current_state');
    expect(keys).toContain('next_state');
    expect(keys).toContain('light');
    expect(keys).toContain('clock_edge');
  });

  test('D flip-flop: generateSequentialTable returns sequential type', () => {
    const src = `module d_ff(input clk, input rst, input d, output reg q);
      always @(posedge clk) begin
        if (rst) q <= 0; else q <= d;
      end
    endmodule`;
    const t = generateSequentialTable(src);
    // No localparam states -> returns sequential message
    expect(t.type).toBe('sequential');
    expect(t.rows.length).toBe(0);
  });

  test('generateTruthTable on sequential returns isSequential=true error', () => {
    const src = `module d_ff(input clk, input d, output reg q);
      always @(posedge clk) q <= d;
    endmodule`;
    const tt = generateTruthTable(src);
    expect(tt.isSequential).toBe(true);
    expect(tt.error).toBe('sequential');
  });

});

// ── Group H: Schematic graph validation ──────────────────────────────────────
describe('Group H — Schematic graph validation', () => {

  function validateGraph(schematic) {
    const nodeIds = new Set(schematic.nodes.map(n => n.id));
    const errors = [];
    for (const conn of schematic.connections) {
      const fromId = conn.from.split('.')[0];
      const toId   = conn.to.split('.')[0];
      if (!nodeIds.has(fromId)) errors.push(`from node missing: ${fromId}`);
      if (!nodeIds.has(toId))   errors.push(`to node missing: ${toId}`);
    }
    return errors;
  }

  test('AND gate: all connection endpoints reference valid nodes', () => {
    const r = analyzeRTL(`module and_gate(input a, input b, output y); assign y = a & b; endmodule`);
    expect(validateGraph(r)).toEqual([]);
  });

  test('Half adder: all connection endpoints reference valid nodes', () => {
    const r = analyzeRTL(`module half_adder(input a, input b, output sum, output cout);
      assign sum = a ^ b; assign cout = a & b; endmodule`);
    expect(validateGraph(r)).toEqual([]);
  });

  test('D flip-flop: all connection endpoints reference valid nodes', () => {
    const r = analyzeRTL(`module d_ff(input clk, input rst, input d, output reg q);
      always @(posedge clk) begin if (rst) q <= 0; else q <= d; end endmodule`);
    expect(validateGraph(r)).toEqual([]);
  });

  test('Traffic Light FSM: all connection endpoints reference valid nodes', () => {
    const r = analyzeRTL(TRAFFIC_LIGHT_SRC);
    expect(validateGraph(r)).toEqual([]);
  });

  test('Traffic Light FSM: has at least one connection', () => {
    const r = analyzeRTL(TRAFFIC_LIGHT_SRC);
    expect(r.connections.length).toBeGreaterThan(0);
  });

  test('Different RTL produces different schematic nodes', () => {
    const r1 = analyzeRTL(`module m(input a, input b, output y); assign y = a & b; endmodule`);
    const r2 = analyzeRTL(`module m(input a, input b, output y); assign y = a | b; endmodule`);
    expect(JSON.stringify(r1.nodes)).not.toBe(JSON.stringify(r2.nodes));
  });

});

// ── Group I: Binary-to-Gray and Parity (live iverilog) ───────────────────────
describe('Group I — Binary-to-Gray and Parity (iverilog required)', () => {
  let hasIverilog = false;
  beforeAll(async () => {
    hasIverilog = await checkIverilog();
    if (!hasIverilog) console.warn('iverilog not found — skipping live tests');
  }, 10000);

  const GRAY_TB = [
    'module tb;',
    '  reg  [3:0] bin4; wire [3:0] gray4;',
    '  reg  [7:0] bin8; wire [7:0] gray8;',
    '  solution #(.WIDTH(4)) dut4(.bin(bin4),.gray(gray4));',
    '  solution #(.WIDTH(8)) dut8(.bin(bin8),.gray(gray8));',
    '  integer i; reg [3:0] exp4; reg [7:0] exp8;',
    '  integer pc, fc;',
    '  initial begin',
    '    $dumpfile("dump.vcd"); $dumpvars(0,tb);',
    '    pc=0; fc=0;',
    '    for(i=0;i<16;i=i+1) begin',
    '      bin4=i[3:0]; exp4=i[3:0]^(i[3:0]>>1); #10;',
    '      if(gray4===exp4) begin $display("PASS: bin=%04b gray=%04b",bin4,gray4); pc=pc+1; end',
    '      else begin $display("FAIL: bin=%04b | expected=%04b got=%04b",bin4,exp4,gray4); fc=fc+1; end',
    '    end',
    '    for(i=0;i<256;i=i+1) begin',
    '      bin8=i[7:0]; exp8=i[7:0]^(i[7:0]>>1); #10;',
    '      if(gray8===exp8) begin $display("PASS: bin8=%08b gray8=%08b",bin8,gray8); pc=pc+1; end',
    '      else begin $display("FAIL: bin8=%08b | expected=%08b got=%08b",bin8,exp8,gray8); fc=fc+1; end',
    '    end',
    '    $finish;',
    '  end',
    'endmodule',
  ].join('\n');

  test('Binary-to-Gray correct: all 272 cases pass (WIDTH=4 + WIDTH=8)', async () => {
    if (!hasIverilog) return;
    const src = `module solution #(parameter WIDTH=4)(input [WIDTH-1:0] bin, output [WIDTH-1:0] gray);
      assign gray = bin ^ (bin >> 1);
    endmodule`;
    const r = await runVerilog(src, GRAY_TB, 15000);
    expect(r.compile_error).toBeNull();
    expect(r.passed).toBe(272);
    expect(r.total).toBe(272);
    expect(r.waveform_vcd).toBeTruthy();
  }, TIMEOUT);

  test('Binary-to-Gray wrong: incorrect RTL fails', async () => {
    if (!hasIverilog) return;
    const src = `module solution #(parameter WIDTH=4)(input [WIDTH-1:0] bin, output [WIDTH-1:0] gray);
      assign gray = bin; // wrong: missing XOR shift
    endmodule`;
    const r = await runVerilog(src, GRAY_TB, 15000);
    expect(r.compile_error).toBeNull();
    expect(r.passed).toBeLessThan(r.total);
  }, TIMEOUT);

  test('Binary-to-Gray: schematic changes when logic changes', () => {
    const correct = `module solution #(parameter WIDTH=4)(input [WIDTH-1:0] bin, output [WIDTH-1:0] gray);
      assign gray = bin ^ (bin >> 1); endmodule`;
    const wrong = `module solution #(parameter WIDTH=4)(input [WIDTH-1:0] bin, output [WIDTH-1:0] gray);
      assign gray = bin; endmodule`;
    const r1 = analyzeRTL(correct);
    const r2 = analyzeRTL(wrong);
    expect(JSON.stringify(r1.nodes)).not.toBe(JSON.stringify(r2.nodes));
  });

  const PARITY_TB = `module tb;
  reg [7:0] data; reg parity_in; wire parity_out, error;
  parity_gen_check uut(.data(data),.parity_in(parity_in),.parity_out(parity_out),.error(error));
  initial begin
    $dumpfile("dump.vcd"); $dumpvars(0,tb);
    data=8'b10110001; parity_in=0; #10;
    if(parity_out===(^data)) $display("PASS: parity_out correct"); else $display("FAIL: parity_out | expected=%0b got=%0b",^data,parity_out);
    parity_in=parity_out; #10;
    if(error===0) $display("PASS: no error with correct parity"); else $display("FAIL: error should be 0 got=%0b",error);
    parity_in=~parity_out; #10;
    if(error===1) $display("PASS: error detected"); else $display("FAIL: error should be 1 got=%0b",error);
    data=8'b11111111; parity_in=0; #10;
    if(parity_out===0) $display("PASS: all-1s parity=0"); else $display("FAIL: all-1s | expected=0 got=%0b",parity_out);
    $finish;
  end
endmodule`;

  test('Parity gen/check correct: all 4 cases pass', async () => {
    if (!hasIverilog) return;
    const src = `module parity_gen_check(input [7:0] data, input parity_in, output parity_out, output error);
      assign parity_out = ^data;
      assign error = parity_in ^ parity_out;
    endmodule`;
    const r = await runVerilog(src, PARITY_TB, 10000);
    expect(r.compile_error).toBeNull();
    expect(r.passed).toBe(4);
    expect(r.total).toBe(4);
  }, TIMEOUT);

  test('Parity gen/check wrong: incorrect RTL fails', async () => {
    if (!hasIverilog) return;
    const src = `module parity_gen_check(input [7:0] data, input parity_in, output parity_out, output error);
      assign parity_out = data[0]; // wrong
      assign error = 0;            // wrong
    endmodule`;
    const r = await runVerilog(src, PARITY_TB, 10000);
    expect(r.compile_error).toBeNull();
    expect(r.passed).toBeLessThan(r.total);
  }, TIMEOUT);

  test('Traffic Light FSM: RED->GREEN->YELLOW->RED verified', async () => {
    if (!hasIverilog) return;
    const r = await runVerilog(TRAFFIC_LIGHT_SRC, TRAFFIC_LIGHT_TB, 10000);
    expect(r.compile_error).toBeNull();
    expect(r.passed).toBe(4);
    expect(r.total).toBe(4);
    expect(r.waveform_vcd).toBeTruthy();
  }, TIMEOUT);

  test('Traffic Light FSM wrong: incorrect transitions fail', async () => {
    if (!hasIverilog) return;
    const wrongSrc = `module traffic_light(input clk, input rst, output reg [1:0] light);
      reg [1:0] state;
      localparam RED=0, GREEN=1, YELLOW=2;
      always @(posedge clk) begin
        if (rst) state <= RED;
        else case(state)
          RED:    state <= RED;   // wrong: stays RED
          GREEN:  state <= YELLOW;
          YELLOW: state <= RED;
        endcase
      end
      always @(*) begin
        case(state)
          RED:    light = 2'b00;
          GREEN:  light = 2'b01;
          YELLOW: light = 2'b10;
          default: light = 2'b00;
        endcase
      end
    endmodule`;
    const r = await runVerilog(wrongSrc, TRAFFIC_LIGHT_TB, 10000);
    expect(r.compile_error).toBeNull();
    expect(r.passed).toBeLessThan(r.total);
  }, TIMEOUT);

});
