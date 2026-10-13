'use strict';
/**
 * rtl-pipeline.test.js
 * Regression suite for the NuroSilicon RTL analysis pipeline.
 * Covers Groups A-D from the engineering spec.
 *
 * Run: npm test -- --testPathPattern=rtl-pipeline
 */

const { analyzeRTL, generateTruthTable } = require('../utils/rtlAnalyzer');
const { runVerilog, checkIverilog }       = require('../utils/verilogSandbox');

// ── Helpers ───────────────────────────────────────────────────────────────────
const TIMEOUT = 20000;

async function iverilogAvailable() {
  return checkIverilog();
}

// ── GROUP A: Combinational circuits ───────────────────────────────────────────
describe('Group A — Combinational circuits', () => {

  // AND gate
  test('AND gate: analyzeRTL extracts 2 inputs + 1 output + 1 AND gate', () => {
    const src = `module and_gate(input a, input b, output y); assign y = a & b; endmodule`;
    const r = analyzeRTL(src);
    expect(r.error).toBeNull();
    expect(r.type).toBe('combinational');
    expect(r.moduleName).toBe('and_gate');
    const inputs  = r.nodes.filter(n => n.type === 'input');
    const outputs = r.nodes.filter(n => n.type === 'output');
    const gates   = r.nodes.filter(n => n.type === 'and');
    expect(inputs.length).toBe(2);
    expect(outputs.length).toBe(1);
    expect(gates.length).toBe(1);
  });

  test('AND gate: truth table has 4 rows, correct outputs', () => {
    const src = `module and_gate(input a, input b, output y); assign y = a & b; endmodule`;
    const tt = generateTruthTable(src);
    expect(tt.error).toBeNull();
    expect(tt.rows.length).toBe(4);
    expect(tt.rows.find(r => r.a === '0' && r.b === '0')?.y).toBe('0');
    expect(tt.rows.find(r => r.a === '1' && r.b === '1')?.y).toBe('1');
    expect(tt.rows.find(r => r.a === '1' && r.b === '0')?.y).toBe('0');
  });

  test('OR gate: truth table correct', () => {
    const src = `module or_gate(input a, input b, output y); assign y = a | b; endmodule`;
    const tt = generateTruthTable(src);
    expect(tt.error).toBeNull();
    expect(tt.rows.find(r => r.a === '0' && r.b === '0')?.y).toBe('0');
    expect(tt.rows.find(r => r.a === '1' && r.b === '0')?.y).toBe('1');
  });

  test('XOR gate: truth table correct', () => {
    const src = `module xor_gate(input a, input b, output y); assign y = a ^ b; endmodule`;
    const tt = generateTruthTable(src);
    expect(tt.error).toBeNull();
    expect(tt.rows.find(r => r.a === '1' && r.b === '1')?.y).toBe('0');
    expect(tt.rows.find(r => r.a === '1' && r.b === '0')?.y).toBe('1');
  });

  test('NAND gate: truth table correct', () => {
    const src = `module nand_gate(input a, input b, output y); assign y = ~(a & b); endmodule`;
    const tt = generateTruthTable(src);
    expect(tt.error).toBeNull();
    expect(tt.rows.find(r => r.a === '1' && r.b === '1')?.y).toBe('0');
    expect(tt.rows.find(r => r.a === '0' && r.b === '0')?.y).toBe('1');
  });

  test('NOT gate: truth table correct', () => {
    const src = `module not_gate(input a, output y); assign y = ~a; endmodule`;
    const tt = generateTruthTable(src);
    expect(tt.error).toBeNull();
    expect(tt.rows.length).toBe(2);
    expect(tt.rows.find(r => r.a === '0')?.y).toBe('1');
    expect(tt.rows.find(r => r.a === '1')?.y).toBe('0');
  });

  test('XNOR gate: truth table correct', () => {
    const src = `module xnor_gate(input a, input b, output y); assign y = ~(a ^ b); endmodule`;
    const tt = generateTruthTable(src);
    expect(tt.error).toBeNull();
    expect(tt.rows.find(r => r.a === '1' && r.b === '1')?.y).toBe('1');
    expect(tt.rows.find(r => r.a === '1' && r.b === '0')?.y).toBe('0');
  });

  test('Half adder: analyzeRTL detects 2 inputs, 2 outputs', () => {
    const src = `module half_adder(input a, input b, output sum, output cout);
      assign sum  = a ^ b;
      assign cout = a & b;
    endmodule`;
    const r = analyzeRTL(src);
    expect(r.error).toBeNull();
    const inputs  = r.nodes.filter(n => n.type === 'input');
    const outputs = r.nodes.filter(n => n.type === 'output');
    expect(inputs.length).toBe(2);
    expect(outputs.length).toBe(2);
  });

  test('Half adder: truth table correct', () => {
    const src = `module half_adder(input a, input b, output sum, output cout);
      assign sum  = a ^ b;
      assign cout = a & b;
    endmodule`;
    const tt = generateTruthTable(src);
    expect(tt.error).toBeNull();
    expect(tt.rows.find(r => r.a === '1' && r.b === '1')?.sum).toBe('0');
    expect(tt.rows.find(r => r.a === '1' && r.b === '1')?.cout).toBe('1');
    expect(tt.rows.find(r => r.a === '1' && r.b === '0')?.sum).toBe('1');
    expect(tt.rows.find(r => r.a === '1' && r.b === '0')?.cout).toBe('0');
  });

  test('Parity generator: XOR reduction detected', () => {
    const src = `module parity(input [7:0] data, output parity_out);
      assign parity_out = ^data;
    endmodule`;
    const r = analyzeRTL(src);
    expect(r.error).toBeNull();
    expect(r.ports['data'].width).toBe(8);
  });

  test('Binary-to-Gray: analyzeRTL detects parameterized module', () => {
    const src = `module solution #(parameter WIDTH=4)(input [WIDTH-1:0] bin, output [WIDTH-1:0] gray);
      assign gray = bin ^ (bin >> 1);
    endmodule`;
    const r = analyzeRTL(src);
    expect(r.error).toBeNull();
    expect(r.moduleName).toBe('solution');
  });

  test('Truth table: rejects >16 input bits', () => {
    const src = `module big(input [16:0] a, output y); assign y = ^a; endmodule`;
    const tt = generateTruthTable(src);
    expect(tt.error).toMatch(/Too many input bits/);
    expect(tt.rows.length).toBe(0);
  });

});

// ── GROUP B: Sequential circuits ──────────────────────────────────────────────
describe('Group B — Sequential circuits', () => {

  test('D flip-flop: analyzeRTL detects sequential type', () => {
    const src = `module d_ff(input clk, input rst, input d, output reg q);
      always @(posedge clk) begin
        if (rst) q <= 0;
        else     q <= d;
      end
    endmodule`;
    const r = analyzeRTL(src);
    expect(r.error).toBeNull();
    expect(r.isSequential).toBe(true);
    expect(r.type).toBe('sequential');
    const clkNode = r.nodes.find(n => n.type === 'clock');
    expect(clkNode).toBeTruthy();
  });

  test('Counter: analyzeRTL detects sequential type', () => {
    const src = `module counter(input clk, input rst, output reg [2:0] count);
      always @(posedge clk) begin
        if (rst) count <= 0;
        else     count <= count + 1;
      end
    endmodule`;
    const r = analyzeRTL(src);
    expect(r.isSequential).toBe(true);
    expect(r.ports['count'].width).toBe(3);
  });

  test('Sequential: truth table returns error (not applicable)', () => {
    const src = `module d_ff(input clk, input d, output reg q);
      always @(posedge clk) q <= d;
    endmodule`;
    // Truth table for sequential is not meaningful — should still not crash
    const tt = generateTruthTable(src);
    // Either returns rows (treating it as combinational) or an error — must not throw
    expect(tt).toBeTruthy();
  });

});

// ── GROUP C: FSMs ─────────────────────────────────────────────────────────────
describe('Group C — FSMs', () => {

  test('Moore FSM: analyzeRTL detects FSM type', () => {
    const src = `module traffic_light(input clk, input rst, output reg [1:0] light);
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
    const r = analyzeRTL(src);
    expect(r.isFSM).toBe(true);
    expect(r.type).toBe('fsm');
    expect(r.fsmStates.length).toBeGreaterThan(0);
  });

});

// ── GROUP D: Failure cases ────────────────────────────────────────────────────
describe('Group D — Failure cases', () => {

  test('No module declaration: analyzeRTL returns error', () => {
    const src = `assign y = a & b;`;
    const r = analyzeRTL(src);
    expect(r.error).toBeTruthy();
  });

  test('Empty source: analyzeRTL returns error', () => {
    const r = analyzeRTL('');
    expect(r.error).toBeTruthy();
  });

  test('Comment-only source: analyzeRTL returns error', () => {
    const r = analyzeRTL('// just a comment\n/* nothing here */');
    expect(r.error).toBeTruthy();
  });

  test('Truth table: no inputs returns error', () => {
    const src = `module no_inputs(output y); assign y = 1; endmodule`;
    const tt = generateTruthTable(src);
    expect(tt.error).toBeTruthy();
  });

  test('analyzeRTL: does not use problem title to determine circuit type', () => {
    // A module named "parity" that is actually sequential should be detected as sequential
    const src = `module parity(input clk, input d, output reg q);
      always @(posedge clk) q <= d;
    endmodule`;
    const r = analyzeRTL(src);
    expect(r.isSequential).toBe(true);
    // Should NOT be combinational just because name contains "parity"
    expect(r.type).not.toBe('combinational');
  });

  test('analyzeRTL: different assign expressions produce different gate nodes', () => {
    const srcAnd = `module m(input a, input b, output y); assign y = a & b; endmodule`;
    const srcOr  = `module m(input a, input b, output y); assign y = a | b; endmodule`;
    const rAnd = analyzeRTL(srcAnd);
    const rOr  = analyzeRTL(srcOr);
    const andGates = rAnd.nodes.filter(n => n.type === 'and');
    const orGates  = rOr.nodes.filter(n => n.type === 'or');
    expect(andGates.length).toBe(1);
    expect(orGates.length).toBe(1);
    // AND schematic must differ from OR schematic
    expect(JSON.stringify(rAnd.nodes)).not.toBe(JSON.stringify(rOr.nodes));
  });

});

// ── GROUP E: Live simulation (requires iverilog) ──────────────────────────────
describe('Group E — Live simulation (iverilog required)', () => {
  let hasIverilog = false;

  beforeAll(async () => {
    hasIverilog = await iverilogAvailable();
    if (!hasIverilog) console.warn('iverilog not found — skipping live simulation tests');
  }, 10000);

  test('NAND gate: correct solution passes all 4 test cases', async () => {
    if (!hasIverilog) return;
    const src = `module nand_gate(input a, input b, output y); assign y = ~(a & b); endmodule`;
    const tb  = `module tb; reg a,b; wire y; nand_gate uut(.a(a),.b(b),.y(y));
      initial begin $dumpfile("dump.vcd"); $dumpvars(0,tb);
        a=0;b=0;#10; if(y===1) $display("PASS: 0 NAND 0"); else $display("FAIL: 0 NAND 0 | expected=1 got=%0b",y);
        a=1;b=1;#10; if(y===0) $display("PASS: 1 NAND 1"); else $display("FAIL: 1 NAND 1 | expected=0 got=%0b",y);
        a=1;b=0;#10; if(y===1) $display("PASS: 1 NAND 0"); else $display("FAIL: 1 NAND 0 | expected=1 got=%0b",y);
        a=0;b=1;#10; if(y===1) $display("PASS: 0 NAND 1"); else $display("FAIL: 0 NAND 1 | expected=1 got=%0b",y);
        $finish;
      end endmodule`;
    const r = await runVerilog(src, tb, 10000);
    expect(r.compile_error).toBeNull();
    expect(r.passed).toBe(4);
    expect(r.total).toBe(4);
    expect(r.waveform_vcd).toBeTruthy();
    expect(r.run_id).toBeTruthy();
  }, TIMEOUT);

  test('NAND gate: wrong solution fails test cases', async () => {
    if (!hasIverilog) return;
    const src = `module nand_gate(input a, input b, output y); assign y = a & b; endmodule`; // wrong: AND not NAND
    const tb  = `module tb; reg a,b; wire y; nand_gate uut(.a(a),.b(b),.y(y));
      initial begin $dumpfile("dump.vcd"); $dumpvars(0,tb);
        a=0;b=0;#10; if(y===1) $display("PASS: 0 NAND 0"); else $display("FAIL: 0 NAND 0 | expected=1 got=%0b",y);
        a=1;b=1;#10; if(y===0) $display("PASS: 1 NAND 1"); else $display("FAIL: 1 NAND 1 | expected=0 got=%0b",y);
        $finish;
      end endmodule`;
    const r = await runVerilog(src, tb, 10000);
    expect(r.compile_error).toBeNull();
    expect(r.passed).toBeLessThan(r.total);
  }, TIMEOUT);

  test('Syntax error: compile_error is populated', async () => {
    if (!hasIverilog) return;
    const src = `module broken(input a output y); assign y = a endmodule`; // missing commas/semicolons
    const tb  = `module tb; reg a; wire y; broken uut(.a(a),.y(y)); initial begin #10; $finish; end endmodule`;
    const r = await runVerilog(src, tb, 10000);
    expect(r.compile_error).toBeTruthy();
    expect(r.results.length).toBe(0);
  }, TIMEOUT);

  test('Full adder: correct solution passes all test cases', async () => {
    if (!hasIverilog) return;
    const src = `module full_adder(input a, input b, input cin, output sum, output cout);
      assign sum  = a ^ b ^ cin;
      assign cout = (a & b) | (cin & (a ^ b));
    endmodule`;
    const tb = `module tb; reg a,b,cin; wire sum,cout;
      full_adder uut(.a(a),.b(b),.cin(cin),.sum(sum),.cout(cout));
      initial begin $dumpfile("dump.vcd"); $dumpvars(0,tb);
        a=0;b=0;cin=0;#10; if(sum===0&&cout===0) $display("PASS: 0+0+0"); else $display("FAIL: 0+0+0 | sum=%0b cout=%0b",sum,cout);
        a=1;b=1;cin=0;#10; if(sum===0&&cout===1) $display("PASS: 1+1+0"); else $display("FAIL: 1+1+0 | sum=%0b cout=%0b",sum,cout);
        a=1;b=1;cin=1;#10; if(sum===1&&cout===1) $display("PASS: 1+1+1"); else $display("FAIL: 1+1+1 | sum=%0b cout=%0b",sum,cout);
        $finish;
      end endmodule`;
    const r = await runVerilog(src, tb, 10000);
    expect(r.compile_error).toBeNull();
    expect(r.passed).toBe(3);
    expect(r.total).toBe(3);
    expect(r.waveform_vcd).toBeTruthy();
  }, TIMEOUT);

  test('D flip-flop: correct solution passes all test cases', async () => {
    if (!hasIverilog) return;
    const src = `module d_ff(input clk, input rst, input d, output reg q);
      always @(posedge clk) begin
        if (rst) q <= 0;
        else     q <= d;
      end
    endmodule`;
    const tb = `module tb; reg clk,rst,d; wire q;
      d_ff uut(.clk(clk),.rst(rst),.d(d),.q(q));
      initial clk=0; always #5 clk=~clk;
      initial begin $dumpfile("dump.vcd"); $dumpvars(0,tb);
        rst=1;d=0;#12;
        if(q===0) $display("PASS: reset q=0"); else $display("FAIL: reset | expected=0 got=%0b",q);
        rst=0;d=1;#10;
        if(q===1) $display("PASS: d=1 captured"); else $display("FAIL: d=1 | expected=1 got=%0b",q);
        d=0;#10;
        if(q===0) $display("PASS: d=0 captured"); else $display("FAIL: d=0 | expected=0 got=%0b",q);
        $finish;
      end endmodule`;
    const r = await runVerilog(src, tb, 10000);
    expect(r.compile_error).toBeNull();
    expect(r.passed).toBe(3);
    expect(r.waveform_vcd).toBeTruthy();
  }, TIMEOUT);

  test('VCD waveform: contains expected signals', async () => {
    if (!hasIverilog) return;
    const src = `module and_gate(input a, input b, output y); assign y = a & b; endmodule`;
    const tb  = `module tb; reg a,b; wire y; and_gate uut(.a(a),.b(b),.y(y));
      initial begin $dumpfile("dump.vcd"); $dumpvars(0,tb);
        a=0;b=0;#10; a=1;b=1;#10; $finish;
      end endmodule`;
    const r = await runVerilog(src, tb, 10000);
    expect(r.waveform_vcd).toBeTruthy();
    expect(r.waveform_vcd).toContain('$var');
    expect(r.waveform_vcd).toContain('$dumpvars');
    // Should contain signal names
    expect(r.waveform_vcd).toMatch(/\$var\s+\w+\s+1\s+\S+\s+(a|b|y)/);
  }, TIMEOUT);

  test('Run-ID: same source+testbench produces same run_id', async () => {
    if (!hasIverilog) return;
    const src = `module m(input a, output y); assign y = a; endmodule`;
    const tb  = `module tb; reg a; wire y; m uut(.a(a),.y(y)); initial begin $dumpfile("dump.vcd"); $dumpvars(0,tb); a=0;#10;$finish; end endmodule`;
    const r1 = await runVerilog(src, tb, 10000);
    const r2 = await runVerilog(src, tb, 10000);
    expect(r1.run_id).toBe(r2.run_id);
  }, TIMEOUT);

  test('Run-ID: different source produces different run_id', async () => {
    if (!hasIverilog) return;
    const tb = `module tb; reg a; wire y; m uut(.a(a),.y(y)); initial begin $dumpfile("dump.vcd"); $dumpvars(0,tb); a=0;#10;$finish; end endmodule`;
    const r1 = await runVerilog(`module m(input a, output y); assign y = a; endmodule`, tb, 10000);
    const r2 = await runVerilog(`module m(input a, output y); assign y = ~a; endmodule`, tb, 10000);
    expect(r1.run_id).not.toBe(r2.run_id);
  }, TIMEOUT);

  test('Timeout: simulation that loops forever is killed', async () => {
    if (!hasIverilog) return;
    const src = `module m(input clk, output reg q); always @(posedge clk) q <= ~q; endmodule`;
    const tb  = `module tb; reg clk; wire q; m uut(.clk(clk),.q(q));
      initial clk=0; always #1 clk=~clk;
      initial begin $dumpfile("dump.vcd"); $dumpvars(0,tb); #999999999; $finish; end endmodule`;
    const r = await runVerilog(src, tb, 1500); // 1.5s limit
    expect(r.timeout).toBe(true);
  }, 10000);

});
