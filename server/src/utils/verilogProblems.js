'use strict';
// 11 Verilog/SystemVerilog lab problems

const GRAY_CODE_TB = [
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
  '    $display("Total: %0d passed %0d failed",pc,fc);',
  '    $finish;',
  '  end',
  'endmodule',
].join('\n');

module.exports = [

  {
    title: 'Binary to Gray Code Converter',
    difficulty: 'easy', level: 1, category: 'combinational', marks: 10,
    description: 'Design a parameterized Binary-to-Gray code converter.\n\ngray = bin ^ (bin >> 1)\n\nExamples (4-bit):\nbin=0000 -> gray=0000\nbin=0001 -> gray=0001\nbin=0010 -> gray=0011\nbin=0011 -> gray=0010\nbin=1011 -> gray=1110\nbin=1111 -> gray=1000',
    starter_code: 'module solution #(\n    parameter WIDTH = 4\n)(\n    input  wire [WIDTH-1:0] bin,\n    output wire [WIDTH-1:0] gray\n);\n    // Hint: gray = bin ^ (bin >> 1)\n\nendmodule',
    testbench: GRAY_CODE_TB,
    visible_test_cases: [
      {bin:'0000',gray:'0000'},{bin:'0001',gray:'0001'},
      {bin:'0010',gray:'0011'},{bin:'0011',gray:'0010'},
      {bin:'1011',gray:'1110'},{bin:'1111',gray:'1000'},
    ],
  },


  // ── EASY 1 ──────────────────────────────────────────────────────────────────
  {
    title: 'NAND Gate',
    difficulty: 'easy', level: 1, category: 'gates', marks: 10,
    description: 'Design a 2-input NAND gate.\n\nOutput y = NOT(a AND b).\n\nTruth table:\na=0 b=0 → y=1\na=0 b=1 → y=1\na=1 b=0 → y=1\na=1 b=1 → y=0',
    starter_code: 'module nand_gate(\n    input  a,\n    input  b,\n    output y\n);\n    // Write your code here\n\nendmodule',
    testbench: 'module tb;\n  reg a,b; wire y;\n  nand_gate uut(.a(a),.b(b),.y(y));\n  initial begin\n    $dumpfile("dump.vcd"); $dumpvars(0,tb);\n    a=0;b=0;#10; if(y===1) $display("PASS: 0 NAND 0=1"); else $display("FAIL: 0 NAND 0 | expected=1 got=%0b",y);\n    a=0;b=1;#10; if(y===1) $display("PASS: 0 NAND 1=1"); else $display("FAIL: 0 NAND 1 | expected=1 got=%0b",y);\n    a=1;b=0;#10; if(y===1) $display("PASS: 1 NAND 0=1"); else $display("FAIL: 1 NAND 0 | expected=1 got=%0b",y);\n    a=1;b=1;#10; if(y===0) $display("PASS: 1 NAND 1=0"); else $display("FAIL: 1 NAND 1 | expected=0 got=%0b",y);\n    $finish;\n  end\nendmodule',
    visible_test_cases: [{a:0,b:0,y:1},{a:0,b:1,y:1},{a:1,b:0,y:1},{a:1,b:1,y:0}],
  },

  // ── EASY 2 ──────────────────────────────────────────────────────────────────
  {
    title: '4-to-1 Multiplexer',
    difficulty: 'easy', level: 2, category: 'combinational', marks: 10,
    description: "Design a 4-to-1 multiplexer.\n\nInputs: d0, d1, d2, d3 (1-bit data), sel[1:0]\nOutput: y\n\nsel=2'b00 → y=d0\nsel=2'b01 → y=d1\nsel=2'b10 → y=d2\nsel=2'b11 → y=d3",
    starter_code: 'module mux4to1(\n    input       d0, d1, d2, d3,\n    input [1:0] sel,\n    output reg  y\n);\n    // Write your code here\n\nendmodule',
    testbench: "module tb;\n  reg d0,d1,d2,d3; reg [1:0] sel; wire y;\n  mux4to1 uut(.d0(d0),.d1(d1),.d2(d2),.d3(d3),.sel(sel),.y(y));\n  initial begin\n    $dumpfile(\"dump.vcd\"); $dumpvars(0,tb);\n    d0=1;d1=0;d2=0;d3=0;sel=2'b00;#10; if(y===1) $display(\"PASS: sel=00 y=1\"); else $display(\"FAIL: sel=00 | expected=1 got=%0b\",y);\n    d0=0;d1=1;d2=0;d3=0;sel=2'b01;#10; if(y===1) $display(\"PASS: sel=01 y=1\"); else $display(\"FAIL: sel=01 | expected=1 got=%0b\",y);\n    d0=0;d1=0;d2=1;d3=0;sel=2'b10;#10; if(y===1) $display(\"PASS: sel=10 y=1\"); else $display(\"FAIL: sel=10 | expected=1 got=%0b\",y);\n    d0=0;d1=0;d2=0;d3=1;sel=2'b11;#10; if(y===1) $display(\"PASS: sel=11 y=1\"); else $display(\"FAIL: sel=11 | expected=1 got=%0b\",y);\n    $finish;\n  end\nendmodule",
    visible_test_cases: [{sel:'00',d0:1,y:1},{sel:'01',d1:1,y:1},{sel:'10',d2:1,y:1},{sel:'11',d3:1,y:1}],
  },

  // ── EASY 3 ──────────────────────────────────────────────────────────────────
  {
    title: 'Full Adder',
    difficulty: 'easy', level: 2, category: 'combinational', marks: 10,
    description: 'Design a 1-bit Full Adder.\n\nInputs: a, b, cin\nOutputs: sum, cout\n\nsum  = a XOR b XOR cin\ncout = (a AND b) OR (cin AND (a XOR b))',
    starter_code: 'module full_adder(\n    input  a, b, cin,\n    output sum, cout\n);\n    // Write your code here\n\nendmodule',
    testbench: 'module tb;\n  reg a,b,cin; wire sum,cout;\n  full_adder uut(.a(a),.b(b),.cin(cin),.sum(sum),.cout(cout));\n  initial begin\n    $dumpfile("dump.vcd"); $dumpvars(0,tb);\n    a=0;b=0;cin=0;#10; if(sum===0&&cout===0) $display("PASS: 0+0+0"); else $display("FAIL: 0+0+0 | sum=%0b cout=%0b",sum,cout);\n    a=0;b=1;cin=0;#10; if(sum===1&&cout===0) $display("PASS: 0+1+0"); else $display("FAIL: 0+1+0 | sum=%0b cout=%0b",sum,cout);\n    a=1;b=1;cin=0;#10; if(sum===0&&cout===1) $display("PASS: 1+1+0"); else $display("FAIL: 1+1+0 | sum=%0b cout=%0b",sum,cout);\n    a=1;b=1;cin=1;#10; if(sum===1&&cout===1) $display("PASS: 1+1+1"); else $display("FAIL: 1+1+1 | sum=%0b cout=%0b",sum,cout);\n    $finish;\n  end\nendmodule',
    visible_test_cases: [{a:0,b:0,cin:0,sum:0,cout:0},{a:0,b:1,cin:0,sum:1,cout:0},{a:1,b:1,cin:0,sum:0,cout:1},{a:1,b:1,cin:1,sum:1,cout:1}],
  },

  // ── EASY 4 ──────────────────────────────────────────────────────────────────
  {
    title: '3-to-8 Decoder',
    difficulty: 'easy', level: 2, category: 'combinational', marks: 10,
    description: "Design a 3-to-8 binary decoder.\n\nInput:  sel[2:0]\nOutput: out[7:0]\n\nExactly one output bit is HIGH equal to the binary value of sel.\nExample: sel=3'b010 → out=8'b00000100",
    starter_code: 'module decoder3to8(\n    input  [2:0] sel,\n    output reg [7:0] out\n);\n    // Write your code here\n\nendmodule',
    testbench: "module tb;\n  reg [2:0] sel; wire [7:0] out;\n  decoder3to8 uut(.sel(sel),.out(out));\n  initial begin\n    $dumpfile(\"dump.vcd\"); $dumpvars(0,tb);\n    sel=3'd0;#10; if(out===8'b00000001) $display(\"PASS: sel=0\"); else $display(\"FAIL: sel=0 | expected=00000001 got=%08b\",out);\n    sel=3'd1;#10; if(out===8'b00000010) $display(\"PASS: sel=1\"); else $display(\"FAIL: sel=1 | expected=00000010 got=%08b\",out);\n    sel=3'd3;#10; if(out===8'b00001000) $display(\"PASS: sel=3\"); else $display(\"FAIL: sel=3 | expected=00001000 got=%08b\",out);\n    sel=3'd7;#10; if(out===8'b10000000) $display(\"PASS: sel=7\"); else $display(\"FAIL: sel=7 | expected=10000000 got=%08b\",out);\n    $finish;\n  end\nendmodule",
    visible_test_cases: [{sel:0,out:'00000001'},{sel:1,out:'00000010'},{sel:3,out:'00001000'},{sel:7,out:'10000000'}],
  },

  // ── MEDIUM 1 ─────────────────────────────────────────────────────────────────
  {
    title: 'T Flip-Flop',
    difficulty: 'medium', level: 3, category: 'flip-flops', marks: 20,
    description: 'Design a T (Toggle) Flip-Flop with synchronous reset.\n\nOn rising edge of clk:\n  if rst=1 → q=0\n  else if t=1 → q toggles (q = ~q)\n  else → q holds\n\nInputs: clk, rst, t\nOutput: q',
    starter_code: 'module t_ff(\n    input  clk, rst, t,\n    output reg q\n);\n    // Write your code here\n\nendmodule',
    testbench: 'module tb;\n  reg clk,rst,t; wire q;\n  t_ff uut(.clk(clk),.rst(rst),.t(t),.q(q));\n  initial clk=0; always #5 clk=~clk;\n  initial begin\n    $dumpfile("dump.vcd"); $dumpvars(0,tb);\n    rst=1;t=0;#12;\n    if(q===0) $display("PASS: reset q=0"); else $display("FAIL: reset | expected=0 got=%0b",q);\n    rst=0;t=1;#10;\n    if(q===1) $display("PASS: toggle 0->1"); else $display("FAIL: toggle 0->1 | expected=1 got=%0b",q);\n    t=1;#10;\n    if(q===0) $display("PASS: toggle 1->0"); else $display("FAIL: toggle 1->0 | expected=0 got=%0b",q);\n    t=0;#10;\n    if(q===0) $display("PASS: hold q=0"); else $display("FAIL: hold | expected=0 got=%0b",q);\n    $finish;\n  end\nendmodule',
    visible_test_cases: [{rst:1,t:0,q:0},{rst:0,t:1,q:1},{t:1,q:0},{t:0,q:0}],
  },

  // ── MEDIUM 2 ─────────────────────────────────────────────────────────────────
  {
    title: '4-bit Shift Register (SISO)',
    difficulty: 'medium', level: 3, category: 'sequential', marks: 20,
    description: 'Design a 4-bit Serial-In Serial-Out (SISO) shift register with synchronous reset.\n\nOn rising edge of clk:\n  if rst=1 → q=4\'b0000\n  else → shift left: q <= {q[2:0], din}\n\nInputs: clk, rst, din\nOutputs: q[3:0], dout (= q[3])',
    starter_code: 'module shift_reg_4bit(\n    input  clk, rst, din,\n    output reg [3:0] q,\n    output dout\n);\n    // Write your code here\n\nendmodule',
    testbench: "module tb;\n  reg clk,rst,din; wire [3:0] q; wire dout;\n  shift_reg_4bit uut(.clk(clk),.rst(rst),.din(din),.q(q),.dout(dout));\n  initial clk=0; always #5 clk=~clk;\n  initial begin\n    $dumpfile(\"dump.vcd\"); $dumpvars(0,tb);\n    rst=1;din=0;#12; rst=0;\n    if(q===4'b0000) $display(\"PASS: reset q=0000\"); else $display(\"FAIL: reset | got=%04b\",q);\n    din=1;#10; if(q===4'b0001) $display(\"PASS: shift 1 q=0001\"); else $display(\"FAIL: shift1 | expected=0001 got=%04b\",q);\n    din=1;#10; if(q===4'b0011) $display(\"PASS: shift 1 q=0011\"); else $display(\"FAIL: shift2 | expected=0011 got=%04b\",q);\n    din=0;#10; if(q===4'b0110) $display(\"PASS: shift 0 q=0110\"); else $display(\"FAIL: shift3 | expected=0110 got=%04b\",q);\n    $finish;\n  end\nendmodule",
    visible_test_cases: [{rst:1,q:'0000'},{din:1,q:'0001'},{din:1,q:'0011'},{din:0,q:'0110'}],
  },

  // ── MEDIUM 3 ─────────────────────────────────────────────────────────────────
  {
    title: '3-bit Up/Down Counter',
    difficulty: 'medium', level: 3, category: 'counters', marks: 20,
    description: 'Design a 3-bit synchronous up/down counter with synchronous reset.\n\nOn rising edge of clk:\n  if rst=1 → count=0\n  else if up=1 → count=count+1 (wraps 7→0)\n  else → count=count-1 (wraps 0→7)\n\nInputs: clk, rst, up\nOutput: count[2:0]',
    starter_code: 'module updown_counter(\n    input  clk, rst, up,\n    output reg [2:0] count\n);\n    // Write your code here\n\nendmodule',
    testbench: 'module tb;\n  reg clk,rst,up; wire [2:0] count;\n  updown_counter uut(.clk(clk),.rst(rst),.up(up),.count(count));\n  initial clk=0; always #5 clk=~clk;\n  initial begin\n    $dumpfile("dump.vcd"); $dumpvars(0,tb);\n    rst=1;up=1;#12; rst=0;\n    if(count===0) $display("PASS: reset=0"); else $display("FAIL: reset | got=%0d",count);\n    up=1;#10; if(count===1) $display("PASS: up=1"); else $display("FAIL: up1 | expected=1 got=%0d",count);\n    up=1;#10; if(count===2) $display("PASS: up=2"); else $display("FAIL: up2 | expected=2 got=%0d",count);\n    up=0;#10; if(count===1) $display("PASS: down=1"); else $display("FAIL: down | expected=1 got=%0d",count);\n    $finish;\n  end\nendmodule',
    visible_test_cases: [{rst:1,count:0},{up:1,count:1},{up:1,count:2},{up:0,count:1}],
  },

  // ── HARD 1 ───────────────────────────────────────────────────────────────────
  {
    title: 'Traffic Light FSM (Moore)',
    difficulty: 'hard', level: 4, category: 'fsm', marks: 30,
    description: "Design a Moore FSM for a simple traffic light controller.\n\nStates (2-bit):\n  RED    = 2'b00\n  GREEN  = 2'b01\n  YELLOW = 2'b10\n\nTransitions on rising clk edge (synchronous reset → RED):\n  RED → GREEN → YELLOW → RED → ...\n\nInputs: clk, rst\nOutput: light[1:0]  (00=RED, 01=GREEN, 10=YELLOW)\n\nOutput depends only on current state (Moore machine).",
    starter_code: "module traffic_light(\n    input  clk, rst,\n    output reg [1:0] light\n);\n    // States: RED=2'b00, GREEN=2'b01, YELLOW=2'b10\n    reg [1:0] state;\n    // Write your FSM here\n\nendmodule",
    testbench: "module tb;\n  reg clk,rst; wire [1:0] light;\n  traffic_light uut(.clk(clk),.rst(rst),.light(light));\n  initial clk=0; always #5 clk=~clk;\n  initial begin\n    $dumpfile(\"dump.vcd\"); $dumpvars(0,tb);\n    rst=1;#12; rst=0;\n    if(light===2'b00) $display(\"PASS: reset=RED\"); else $display(\"FAIL: reset | expected=00 got=%02b\",light);\n    #10; if(light===2'b01) $display(\"PASS: RED->GREEN\"); else $display(\"FAIL: RED->GREEN | expected=01 got=%02b\",light);\n    #10; if(light===2'b10) $display(\"PASS: GREEN->YELLOW\"); else $display(\"FAIL: GREEN->YELLOW | expected=10 got=%02b\",light);\n    #10; if(light===2'b00) $display(\"PASS: YELLOW->RED\"); else $display(\"FAIL: YELLOW->RED | expected=00 got=%02b\",light);\n    $finish;\n  end\nendmodule",
    visible_test_cases: [{rst:1,light:'00'},{light:'01'},{light:'10'},{light:'00'}],
  },

  // ── HARD 2 ───────────────────────────────────────────────────────────────────
  {
    title: 'Sequence Detector: 1011 (Mealy FSM)',
    difficulty: 'hard', level: 4, category: 'fsm', marks: 30,
    description: 'Design a Mealy FSM that detects the serial bit pattern "1011".\n\nOutput det=1 for one clock cycle when the last 4 bits received are 1-0-1-1.\nOverlapping sequences are allowed.\n\nInputs: clk, rst (synchronous), din\nOutput: det\n\nStates:\n  S0: no match\n  S1: matched "1"\n  S2: matched "10"\n  S3: matched "101"\n  det=1 when in S3 and din=1 (Mealy output)',
    starter_code: 'module seq_det_1011(\n    input  clk, rst, din,\n    output reg det\n);\n    reg [1:0] state;\n    // States: S0=0, S1=1, S2=2, S3=3\n    // Write your Mealy FSM here\n\nendmodule',
    testbench: 'module tb;\n  reg clk,rst,din; wire det;\n  seq_det_1011 uut(.clk(clk),.rst(rst),.din(din),.det(det));\n  initial clk=0; always #5 clk=~clk;\n  task send; input b; begin din=b;#10; end endtask\n  initial begin\n    $dumpfile("dump.vcd"); $dumpvars(0,tb);\n    rst=1;din=0;#12; rst=0;\n    send(1);send(0);send(1);send(1);\n    if(det===1) $display("PASS: detected 1011"); else $display("FAIL: 1011 not detected | det=%0b",det);\n    send(0);\n    if(det===0) $display("PASS: no detect after 0"); else $display("FAIL: spurious detect | det=%0b",det);\n    send(1);send(0);send(1);send(1);\n    if(det===1) $display("PASS: detected 1011 again"); else $display("FAIL: 1011 second | det=%0b",det);\n    $finish;\n  end\nendmodule',
    visible_test_cases: [{sequence:'1011',det:1},{sequence:'10110',det:0},{sequence:'101011',det:1}],
  },

  // ── HARD 3 ───────────────────────────────────────────────────────────────────
  {
    title: '8-bit Parity Generator & Checker',
    difficulty: 'hard', level: 5, category: 'rtl_design', marks: 30,
    description: 'Design an 8-bit even parity generator and checker.\n\nGenerator:\n  Input:  data[7:0]\n  Output: parity_out = XOR of all 8 data bits\n  (ensures total 1s in {data, parity_out} is even)\n\nChecker:\n  Inputs: data[7:0], parity_in\n  Output: error = 1 if {data, parity_in} has an odd number of 1s\n\nCombine both in one module.',
    starter_code: 'module parity_gen_check(\n    input  [7:0] data,\n    input        parity_in,\n    output       parity_out,\n    output       error\n);\n    // parity_out: generated even parity bit (XOR of data bits)\n    // error: 1 if received parity is wrong\n    // Write your code here\n\nendmodule',
    testbench: 'module tb;\n  reg [7:0] data; reg parity_in; wire parity_out,error;\n  parity_gen_check uut(.data(data),.parity_in(parity_in),.parity_out(parity_out),.error(error));\n  initial begin\n    $dumpfile("dump.vcd"); $dumpvars(0,tb);\n    data=8\'b10110001;parity_in=0;#10;\n    if(parity_out===(^data)) $display("PASS: parity_out correct"); else $display("FAIL: parity_out | expected=%0b got=%0b",^data,parity_out);\n    parity_in=parity_out;#10;\n    if(error===0) $display("PASS: no error with correct parity"); else $display("FAIL: error should be 0 got=%0b",error);\n    parity_in=~parity_out;#10;\n    if(error===1) $display("PASS: error detected"); else $display("FAIL: error should be 1 got=%0b",error);\n    data=8\'b11111111;parity_in=0;#10;\n    if(parity_out===0) $display("PASS: all-1s parity=0"); else $display("FAIL: all-1s | expected=0 got=%0b",parity_out);\n    $finish;\n  end\nendmodule',
    visible_test_cases: [{data:'10110001',note:'parity_out=XOR of bits'},{parity_in:'correct',error:0},{parity_in:'flipped',error:1}],
  },

];
