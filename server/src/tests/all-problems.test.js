'use strict';
/**
 * all-problems.test.js
 * Full end-to-end test of every problem in verilogProblems.js
 * Tests: correct solution passes, wrong solution fails,
 *        analyzeRTL graph validity, truth table / sequential table,
 *        VCD waveform generation, schematic node/connection counts.
 */

const { analyzeRTL, generateTruthTable, generateSequentialTable } = require('../utils/rtlAnalyzer');
const { runVerilog, checkIverilog } = require('../utils/verilogSandbox');
const PROBLEMS = require('../utils/verilogProblems');

const T = 20000;

// ── Graph validator ───────────────────────────────────────────────────────────
function validateGraph(r) {
  const errors = [];
  if (r.error) { errors.push('analyzeRTL error: ' + r.error); return errors; }
  const nodeIds = new Set(r.nodes.map(n => n.id));
  for (const c of r.connections) {
    const fromId = c.from.split('.')[0];
    const toId   = c.to.split('.')[0];
    if (!nodeIds.has(fromId)) errors.push(`dangling from: ${c.from}`);
    if (!nodeIds.has(toId))   errors.push(`dangling to: ${c.to}`);
  }
  // Every port in ports{} must have a node
  for (const pname of Object.keys(r.ports)) {
    if (!nodeIds.has(`port_${pname}`)) errors.push(`missing port node: port_${pname}`);
  }
  return errors;
}

// ── Correct solutions ─────────────────────────────────────────────────────────
const CORRECT = {
  'Binary to Gray Code Converter': `module solution #(parameter WIDTH=4)(input [WIDTH-1:0] bin, output [WIDTH-1:0] gray);
    assign gray = bin ^ (bin >> 1);
  endmodule`,

  'NAND Gate': `module nand_gate(input a, input b, output y);
    assign y = ~(a & b);
  endmodule`,

  '4-to-1 Multiplexer': `module mux4to1(input d0,d1,d2,d3, input [1:0] sel, output reg y);
    always @(*) case(sel)
      2'b00: y=d0; 2'b01: y=d1; 2'b10: y=d2; 2'b11: y=d3;
    endcase
  endmodule`,

  'Full Adder': `module full_adder(input a,b,cin, output sum,cout);
    assign sum  = a ^ b ^ cin;
    assign cout = (a&b)|(cin&(a^b));
  endmodule`,

  '3-to-8 Decoder': `module decoder3to8(input [2:0] sel, output reg [7:0] out);
    always @(*) out = 8'b1 << sel;
  endmodule`,

  'T Flip-Flop': `module t_ff(input clk,rst,t, output reg q);
    always @(posedge clk) begin
      if (rst) q <= 0;
      else if (t) q <= ~q;
    end
  endmodule`,

  '4-bit Shift Register (SISO)': `module shift_reg_4bit(input clk,rst,din, output reg [3:0] q, output dout);
    assign dout = q[3];
    always @(posedge clk) begin
      if (rst) q <= 4'b0;
      else q <= {q[2:0], din};
    end
  endmodule`,

  '3-bit Up/Down Counter': `module updown_counter(input clk,rst,up, output reg [2:0] count);
    always @(posedge clk) begin
      if (rst) count <= 0;
      else if (up) count <= count + 1;
      else count <= count - 1;
    end
  endmodule`,

  'Traffic Light FSM (Moore)': `module traffic_light(input clk,rst, output reg [1:0] light);
    reg [1:0] state;
    localparam RED=2'b00, GREEN=2'b01, YELLOW=2'b10;
    always @(posedge clk) begin
      if (rst) state <= RED;
      else case(state)
        RED:    state <= GREEN;
        GREEN:  state <= YELLOW;
        YELLOW: state <= RED;
        default: state <= RED;
      endcase
    end
    always @(*) case(state)
      RED:    light = 2'b00;
      GREEN:  light = 2'b01;
      YELLOW: light = 2'b10;
      default: light = 2'b00;
    endcase
  endmodule`,

  'Sequence Detector: 1011 (Mealy FSM)': `module seq_det_1011(input clk,rst,din, output reg det);
    reg [1:0] state;
    localparam S0=0,S1=1,S2=2,S3=3;
    always @(posedge clk) begin
      if (rst) begin state<=S0; det<=0; end
      else case(state)
        S0: begin det<=0; state<=din?S1:S0; end
        S1: begin det<=0; state<=din?S1:S2; end
        S2: begin det<=0; state<=din?S3:S0; end
        S3: begin det<=din?1:0; state<=din?S1:S2; end
      endcase
    end
  endmodule`,

  '8-bit Parity Generator & Checker': `module parity_gen_check(input [7:0] data, input parity_in, output parity_out, output error);
    assign parity_out = ^data;
    assign error = parity_in ^ parity_out;
  endmodule`,
};

// ── Wrong solutions ───────────────────────────────────────────────────────────
const WRONG = {
  'Binary to Gray Code Converter': `module solution #(parameter WIDTH=4)(input [WIDTH-1:0] bin, output [WIDTH-1:0] gray);
    assign gray = bin; // wrong: missing XOR shift
  endmodule`,

  'NAND Gate': `module nand_gate(input a, input b, output y);
    assign y = a & b; // wrong: AND not NAND
  endmodule`,

  'Full Adder': `module full_adder(input a,b,cin, output sum,cout);
    assign sum  = a & b; // wrong
    assign cout = a | b; // wrong
  endmodule`,

  'Traffic Light FSM (Moore)': `module traffic_light(input clk,rst, output reg [1:0] light);
    reg [1:0] state;
    localparam RED=2'b00, GREEN=2'b01, YELLOW=2'b10;
    always @(posedge clk) begin
      if (rst) state <= RED;
      else state <= RED; // wrong: always stays RED
    end
    always @(*) case(state)
      RED:    light = 2'b00;
      GREEN:  light = 2'b01;
      YELLOW: light = 2'b10;
      default: light = 2'b00;
    endcase
  endmodule`,

  '8-bit Parity Generator & Checker': `module parity_gen_check(input [7:0] data, input parity_in, output parity_out, output error);
    assign parity_out = data[0]; // wrong
    assign error = 0;            // wrong
  endmodule`,
};

// ── Syntax error solution ─────────────────────────────────────────────────────
const SYNTAX_ERROR = `module broken(input a output y); assign y = a endmodule`;

// =============================================================================
// GROUP J: Static analysis — all 11 problems
// =============================================================================
describe('Group J — Static analysis (all 11 problems)', () => {

  for (const prob of PROBLEMS) {
    const correctSrc = CORRECT[prob.title];
    if (!correctSrc) continue;

    test(`${prob.title}: analyzeRTL graph is valid (no dangling wires)`, () => {
      const r = analyzeRTL(correctSrc);
      expect(r.error).toBeNull();
      const errs = validateGraph(r);
      expect(errs).toEqual([]);
    });

    test(`${prob.title}: analyzeRTL detects correct circuit type`, () => {
      const r = analyzeRTL(correctSrc);
      expect(r.error).toBeNull();
      if (prob.category === 'fsm') {
        expect(r.isFSM).toBe(true);
        expect(r.type).toBe('fsm');
      } else if (['sequential','flip-flops','counters'].includes(prob.category)) {
        expect(r.isSequential).toBe(true);
      } else if (prob.category === 'combinational' || prob.category === 'gates' || prob.category === 'rtl_design') {
        expect(r.isSequential).toBe(false);
        expect(r.isFSM).toBe(false);
      }
    });

    test(`${prob.title}: has at least 2 nodes and correct ports`, () => {
      const r = analyzeRTL(correctSrc);
      expect(r.nodes.length).toBeGreaterThanOrEqual(2);
      expect(Object.keys(r.ports).length).toBeGreaterThan(0);
    });
  }

  // Truth table tests — combinational only
  test('NAND Gate: truth table has 4 rows, all correct', () => {
    const tt = generateTruthTable(CORRECT['NAND Gate']);
    expect(tt.error).toBeNull();
    expect(tt.isSequential).toBe(false);
    expect(tt.rows.length).toBe(4);
    expect(tt.rows.find(r => r.a==='1' && r.b==='1')?.y).toBe('0');
    expect(tt.rows.find(r => r.a==='0' && r.b==='0')?.y).toBe('1');
  });

  test('Full Adder: truth table has 8 rows, correct sum/cout', () => {
    const tt = generateTruthTable(CORRECT['Full Adder']);
    expect(tt.error).toBeNull();
    expect(tt.rows.length).toBe(8);
    expect(tt.rows.find(r => r.a==='1' && r.b==='1' && r.cin==='1')?.sum).toBe('1');
    expect(tt.rows.find(r => r.a==='1' && r.b==='1' && r.cin==='1')?.cout).toBe('1');
    expect(tt.rows.find(r => r.a==='0' && r.b==='0' && r.cin==='0')?.sum).toBe('0');
  });

  test('Parity: truth table has 512 rows (9 input bits, within 16-bit limit)', () => {
    const tt = generateTruthTable(CORRECT['8-bit Parity Generator & Checker']);
    // 8 data bits + 1 parity_in = 9 bits = 512 rows — within the 16-bit (65536) limit
    expect(tt.error).toBeNull();
    expect(tt.rows.length).toBe(512);
  });

  // Sequential table tests
  test('Traffic Light FSM: sequential table has 4 rows with correct outputs', () => {
    const t = generateSequentialTable(CORRECT['Traffic Light FSM (Moore)']);
    expect(t.type).toBe('fsm');
    expect(t.rows.length).toBe(4);
    expect(t.rows.find(r => r.current_state==='RED' && r.next_state==='GREEN')?.light).toBe('00');
    expect(t.rows.find(r => r.current_state==='GREEN' && r.next_state==='YELLOW')?.light).toBe('01');
    expect(t.rows.find(r => r.current_state==='YELLOW' && r.next_state==='RED')?.light).toBe('10');
  });

  test('T Flip-Flop: sequential table returns sequential type (no localparam states)', () => {
    const t = generateSequentialTable(CORRECT['T Flip-Flop']);
    expect(t.type).toBe('sequential');
  });

  test('3-bit Up/Down Counter: sequential table returns sequential type', () => {
    const t = generateSequentialTable(CORRECT['3-bit Up/Down Counter']);
    expect(t.type).toBe('sequential');
  });

  // Sequential designs must NOT return combinational truth tables
  test('T Flip-Flop: generateTruthTable returns isSequential=true', () => {
    const tt = generateTruthTable(CORRECT['T Flip-Flop']);
    expect(tt.isSequential).toBe(true);
    expect(tt.error).toBe('sequential');
  });

  test('Traffic Light FSM: generateTruthTable returns isSequential=true', () => {
    const tt = generateTruthTable(CORRECT['Traffic Light FSM (Moore)']);
    expect(tt.isSequential).toBe(true);
  });

  // FSM structural nodes
  test('Traffic Light FSM: has NSL and ODEC structural nodes', () => {
    const r = analyzeRTL(CORRECT['Traffic Light FSM (Moore)']);
    expect(r.nodes.find(n => n.type === 'nsl')).toBeTruthy();
    expect(r.nodes.find(n => n.type === 'odec')).toBeTruthy();
  });

  test('Traffic Light FSM: NSL feedback loop exists (DFF.q->NSL->DFF.d)', () => {
    const r = analyzeRTL(CORRECT['Traffic Light FSM (Moore)']);
    const dff = r.nodes.find(n => n.type === 'dff');
    expect(r.connections.find(c => c.from === `${dff.id}.q` && c.to === 'nsl.in')).toBeTruthy();
    expect(r.connections.find(c => c.from === 'nsl.out' && c.to === `${dff.id}.d`)).toBeTruthy();
  });

  test('Traffic Light FSM: ODEC->light connection exists', () => {
    const r = analyzeRTL(CORRECT['Traffic Light FSM (Moore)']);
    expect(r.connections.find(c => c.from === 'odec.out' && c.to === 'port_light.in')).toBeTruthy();
  });

  test('Sequence Detector (Mealy): analyzeRTL detects FSM with 4 states', () => {
    const r = analyzeRTL(CORRECT['Sequence Detector: 1011 (Mealy FSM)']);
    expect(r.isFSM).toBe(true);
    expect(r.fsmStates.length).toBe(4);
    const names = r.fsmStates.map(s => s.name);
    expect(names).toContain('S0');
    expect(names).toContain('S3');
  });

  // Different RTL → different schematic
  test('NAND vs AND: different RTL produces different schematic', () => {
    const rNAND = analyzeRTL(CORRECT['NAND Gate']);
    const rAND  = analyzeRTL(`module nand_gate(input a,b, output y); assign y = a & b; endmodule`);
    expect(JSON.stringify(rNAND.nodes)).not.toBe(JSON.stringify(rAND.nodes));
  });

  // Comma-separated port parsing
  test('Traffic Light: comma-separated ports (clk,rst) both parsed', () => {
    const r = analyzeRTL(CORRECT['Traffic Light FSM (Moore)']);
    expect(r.ports['clk']).toBeTruthy();
    expect(r.ports['rst']).toBeTruthy();
    expect(r.nodes.find(n => n.portName === 'rst')).toBeTruthy();
  });

  // 2-bit localparam values parsed correctly
  test("Traffic Light: localparam RED=2'b00 parsed as val='2'b00' not '2'", () => {
    const r = analyzeRTL(CORRECT['Traffic Light FSM (Moore)']);
    const red = r.fsmStates.find(s => s.name === 'RED');
    expect(red).toBeTruthy();
    expect(red.val).not.toBe('2'); // was the bug
    expect(red.val).toBe("2'b00");
  });

  // Syntax error
  test('Syntax error: analyzeRTL does not crash (static parser is lenient)', () => {
    // The static parser extracts what it can — syntax errors are caught by iverilog
    // It should not throw an exception
    const r = analyzeRTL(SYNTAX_ERROR);
    expect(r).toBeTruthy();
    expect(r.nodes).toBeDefined();
    // May or may not have an error — the important thing is it doesn't crash
  });

  // Empty / no module
  test('Empty source: analyzeRTL returns error', () => {
    const r = analyzeRTL('');
    expect(r.error).toBeTruthy();
  });

  // Parameterized module
  test('Binary-to-Gray: parameterized module detected', () => {
    const r = analyzeRTL(CORRECT['Binary to Gray Code Converter']);
    expect(r.moduleName).toBe('solution');
    expect(r.error).toBeNull();
  });

  // Multi-output combinational
  test('Full Adder: 2 inputs, 2 outputs detected', () => {
    const r = analyzeRTL(CORRECT['Full Adder']);
    const inputs  = r.nodes.filter(n => n.type === 'input');
    const outputs = r.nodes.filter(n => n.type === 'output');
    expect(inputs.length).toBe(3);  // a, b, cin
    expect(outputs.length).toBe(2); // sum, cout
  });

  // Bus width
  test('3-to-8 Decoder: sel[2:0] width=3, out[7:0] width=8', () => {
    const r = analyzeRTL(CORRECT['3-to-8 Decoder']);
    expect(r.ports['sel'].width).toBe(3);
    expect(r.ports['out'].width).toBe(8);
  });

  test('4-bit Shift Register: q[3:0] width=4', () => {
    const r = analyzeRTL(CORRECT['4-bit Shift Register (SISO)']);
    expect(r.ports['q'].width).toBe(4);
  });
});

// =============================================================================
// GROUP K: Live simulation — all 11 problems (iverilog required)
// =============================================================================
describe('Group K — Live simulation (iverilog required)', () => {
  let hasIverilog = false;
  beforeAll(async () => {
    hasIverilog = await checkIverilog();
    if (!hasIverilog) console.warn('iverilog not found — skipping live tests');
  }, 10000);

  for (const prob of PROBLEMS) {
    const correctSrc = CORRECT[prob.title];
    const wrongSrc   = WRONG[prob.title];
    if (!correctSrc) continue;

    test(`${prob.title}: correct solution passes all test cases`, async () => {
      if (!hasIverilog) return;
      const r = await runVerilog(correctSrc, prob.testbench, 15000);
      expect(r.compile_error).toBeNull();
      expect(r.passed).toBe(r.total);
      expect(r.total).toBeGreaterThan(0);
      expect(r.waveform_vcd).toBeTruthy();
    }, T);

    if (wrongSrc) {
      test(`${prob.title}: wrong solution fails`, async () => {
        if (!hasIverilog) return;
        const r = await runVerilog(wrongSrc, prob.testbench, 15000);
        expect(r.compile_error).toBeNull();
        expect(r.passed).toBeLessThan(r.total);
      }, T);
    }
  }

  // Syntax error compile check
  test('Syntax error: compile_error is populated, no results', async () => {
    if (!hasIverilog) return;
    const tb = `module tb; reg a; wire y; nand_gate uut(.a(a),.b(a),.y(y));
      initial begin #10; $finish; end endmodule`;
    const r = await runVerilog(SYNTAX_ERROR, tb, 10000);
    expect(r.compile_error).toBeTruthy();
    expect(r.results.length).toBe(0);
  }, T);

  // VCD waveform content check
  test('NAND Gate: VCD contains signal variables', async () => {
    if (!hasIverilog) return;
    const prob = PROBLEMS.find(p => p.title === 'NAND Gate');
    const r = await runVerilog(CORRECT['NAND Gate'], prob.testbench, 10000);
    expect(r.waveform_vcd).toContain('$var');
    expect(r.waveform_vcd).toContain('$dumpvars');
  }, T);

  // Run-ID consistency
  test('Run-ID: same source+testbench produces same run_id', async () => {
    if (!hasIverilog) return;
    const prob = PROBLEMS.find(p => p.title === 'Full Adder');
    const r1 = await runVerilog(CORRECT['Full Adder'], prob.testbench, 10000);
    const r2 = await runVerilog(CORRECT['Full Adder'], prob.testbench, 10000);
    expect(r1.run_id).toBe(r2.run_id);
  }, T);

  test('Run-ID: different source produces different run_id', async () => {
    if (!hasIverilog) return;
    const prob = PROBLEMS.find(p => p.title === 'NAND Gate');
    const r1 = await runVerilog(CORRECT['NAND Gate'], prob.testbench, 10000);
    const r2 = await runVerilog(WRONG['NAND Gate'],   prob.testbench, 10000);
    expect(r1.run_id).not.toBe(r2.run_id);
  }, T);

  // Stale artifact guard: failed run must not reuse previous VCD
  test('Stale guard: failed compile has null waveform_vcd', async () => {
    if (!hasIverilog) return;
    const prob = PROBLEMS.find(p => p.title === 'NAND Gate');
    const r = await runVerilog(SYNTAX_ERROR, prob.testbench, 10000);
    expect(r.compile_error).toBeTruthy();
    expect(r.waveform_vcd).toBeNull();
  }, T);

  // Timeout detection
  test('Timeout: infinite loop simulation is killed', async () => {
    if (!hasIverilog) return;
    const src = `module m(input clk, output reg q); always @(posedge clk) q<=~q; endmodule`;
    const tb  = `module tb; reg clk; wire q; m uut(.clk(clk),.q(q));
      initial clk=0; always #1 clk=~clk;
      initial begin $dumpfile("dump.vcd"); $dumpvars(0,tb); #999999999; $finish; end endmodule`;
    const r = await runVerilog(src, tb, 1500);
    expect(r.timeout).toBe(true);
  }, 10000);
});
