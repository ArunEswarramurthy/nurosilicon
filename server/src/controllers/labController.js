'use strict';

const { LabProblem, LabSubmission, LabGroup } = require('../models');
const { runLabCode, runFreeCode, checkCompilers } = require('../utils/labSandbox');
const { publicizeResultPayload, publicErrorMessage, sanitizeResultEntry } = require('../utils/publicResult');

const HDL_LANGS = ['verilog', 'vhdl', 'systemverilog'];

// Strip hidden test case details before sending to student
function safeResults(results) {
  return (results || []).map(sanitizeResultEntry);
}

// GET /api/lab/problems
exports.listProblems = async (req, res) => {
  try {
    const { language, difficulty, level, category, group_id } = req.query;
    const isSuperAdmin = req.user?.role === 'super_admin';
    // super_admin sees all problems (active + inactive); everyone else only active
    const where = isSuperAdmin ? {} : { is_active: true };
    if (language)   where.language   = language;
    if (difficulty) where.difficulty = difficulty;
    if (level)      where.level      = parseInt(level);
    if (category)   where.category   = category;
    const groupInclude = group_id
      ? [{ model: LabGroup, as: 'groups', where: { id: group_id }, required: true, attributes: [] }]
      : [{ model: LabGroup, as: 'groups', attributes: ['id'], through: { attributes: [] } }];

    const problems = await LabProblem.findAll({
      where,
      include: groupInclude,
      attributes: { exclude: ['testbench', 'solution_code', 'test_cases', 'hidden_test_cases'] },
      order: [['level', 'ASC'], ['difficulty', 'ASC'], ['created_at', 'ASC']],
    });

    let statusMap = {};
    if (req.user) {
      const subs = await LabSubmission.findAll({
        where: { user_id: req.user.id, mode: 'submit' },
        attributes: ['problem_id', 'status', 'score'],
      });
      for (const s of subs) {
        const existing = statusMap[s.problem_id];
        if (!existing || s.status === 'passed') statusMap[s.problem_id] = s.status;
      }
    }

    const data = problems.map((p) => ({ ...p.toJSON(), my_status: statusMap[p.id] || 'not_attempted' }));
    res.json({ problems: data });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

// GET /api/lab/problems/:id
exports.getProblem = async (req, res) => {
  try {
    const problem = await LabProblem.findByPk(req.params.id, {
      attributes: { exclude: ['testbench', 'solution_code', 'hidden_test_cases'] },
      include: [{ model: LabGroup, as: 'groups', attributes: ['id', 'name', 'icon', 'color'], through: { attributes: [] } }],
    });
    if (!problem) return res.status(404).json({ message: 'Problem not found' });
    res.json({ problem });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

// GET /api/lab/problems/:id/full  (super_admin only)
exports.getProblemFull = async (req, res) => {
  try {
    const problem = await LabProblem.findByPk(req.params.id);
    if (!problem) return res.status(404).json({ message: 'Problem not found' });
    res.json({ problem });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

// POST /api/lab/problems
exports.createProblem = async (req, res) => {
  try {
    const { title, language, starter_code, testbench, test_cases, hidden_test_cases,
            description, category, difficulty, level, marks, reward_points, medal_image_url, time_limit_s, group_id, group_ids,
            solution_code, visible_test_cases, allowed_languages, question_no, org_id } = req.body;

    if (!title || !language || !starter_code)
      return res.status(400).json({ message: 'title, language, starter_code required' });
    if (HDL_LANGS.includes(language) && !testbench)
      return res.status(400).json({ message: 'testbench required for HDL languages' });
    if (!HDL_LANGS.includes(language) && (!test_cases || test_cases.length === 0))
      return res.status(400).json({ message: 'test_cases required for programming languages (min 1)' });

    const problem = await LabProblem.create({
      title, language, starter_code, testbench, test_cases,
      hidden_test_cases: hidden_test_cases || [],
      allowed_languages: allowed_languages || [],
      question_no: question_no || null,
      description,
      category: category || 'general',
      difficulty: difficulty || 'easy',
      level: level || 1,
      marks: marks || 10,
      reward_points: Number.isFinite(Number(reward_points)) ? Math.max(0, Number(reward_points)) : (marks || 10),
      medal_image_url: medal_image_url || null,
      group_id: group_id || null,
      time_limit_s: time_limit_s || 10,
      solution_code,
      visible_test_cases: visible_test_cases || [],
      org_id: org_id || null,
      created_by: req.user.id,
    });
    const selectedGroups = Array.isArray(group_ids) ? group_ids : (group_id ? [group_id] : []);
    if (selectedGroups.length) await problem.setGroups(selectedGroups);

    res.status(201).json({ problem });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

// PUT /api/lab/problems/:id
exports.updateProblem = async (req, res) => {
  try {
    const problem = await LabProblem.findByPk(req.params.id);
    if (!problem) return res.status(404).json({ message: 'Problem not found' });

    const fields = ['title', 'description', 'language', 'category', 'difficulty', 'level',
                    'marks', 'reward_points', 'medal_image_url', 'time_limit_s', 'group_id', 'starter_code', 'solution_code', 'testbench',
                    'visible_test_cases', 'test_cases', 'hidden_test_cases', 'allowed_languages',
                    'question_no', 'is_active', 'org_id'];
    fields.forEach((f) => { if (req.body[f] !== undefined) problem[f] = req.body[f]; });
    await problem.save();
    if (Array.isArray(req.body.group_ids)) await problem.setGroups(req.body.group_ids);
    res.json({ problem });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

// DELETE /api/lab/problems/:id
exports.deleteProblem = async (req, res) => {
  try {
    const problem = await LabProblem.findByPk(req.params.id);
    if (!problem) return res.status(404).json({ message: 'Problem not found' });
    await problem.update({ is_active: false });
    res.json({ message: 'Problem deactivated' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

// POST /api/lab/problems/:id/run
exports.run = async (req, res) => {
  try {
    const problem = await LabProblem.findByPk(req.params.id);
    if (!problem || !problem.is_active) return res.status(404).json({ message: 'Problem not found' });

    const { source_code, chosen_language, custom_cases } = req.body;
    if (!source_code) return res.status(400).json({ message: 'source_code required' });

    // If allowed_languages is empty, any programming language is allowed
    const allowed = problem.allowed_languages?.length ? problem.allowed_languages : null;
    const lang = (chosen_language && (!allowed || allowed.includes(chosen_language)))
      ? chosen_language
      : problem.language;

    const sub = await LabSubmission.create({
      problem_id: problem.id, user_id: req.user.id, language: lang,
      source_code, mode: 'run', status: 'running',
    });

    const io = global._gradingIo;
    if (io) io.to(`user:${req.user.id}`).emit('lab:running', { submission_id: sub.id });
    res.json({ submission_id: sub.id, status: 'running' });

    setImmediate(async () => {
      try {
        const tl = (problem.time_limit_s || 10) * 1000;
        const result = await runLabCode(lang, source_code, problem, tl, 'run', custom_cases);
        const status = result.compile_error ? 'error' : (result.timeout ? 'timeout' : (result.passed === result.total && result.total > 0 ? 'passed' : 'failed'));

        await sub.update({
          status,
          compile_error: result.compile_error || null,
          results: result.results || [],
          waveform_vcd: result.waveform_vcd || null,
          stdout: result.stdout || null,
          runtime_ms: result.runtime_ms || 0,
          passed_cases: result.passed || 0,
          total_cases: result.total || 0,
          score: 0,
        });

        if (io) {
          io.to(`user:${req.user.id}`).emit('lab:result', publicizeResultPayload({
            submission_id: sub.id, mode: 'run', status,
            compile_error: result.compile_error,
            results: safeResults(result.results),
            waveform_vcd: result.waveform_vcd,
            stdout: result.stdout,
            passed: result.passed, total: result.total,
            runtime_ms: result.runtime_ms, score: 0,
          }));
        }
      } catch (err) {
        console.error('Lab run error:', err);
        await sub.update({ status: 'error', compile_error: err.message });
        if (io) io.to(`user:${req.user.id}`).emit('lab:result', publicizeResultPayload({ submission_id: sub.id, mode: 'run', status: 'error', compile_error: err.message }));
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

// POST /api/lab/problems/:id/submit
exports.submit = async (req, res) => {
  try {
    const problem = await LabProblem.findByPk(req.params.id);
    if (!problem || !problem.is_active) return res.status(404).json({ message: 'Problem not found' });

    const { source_code, chosen_language } = req.body;
    if (!source_code) return res.status(400).json({ message: 'source_code required' });

    // If allowed_languages is empty, any programming language is allowed
    const allowed = problem.allowed_languages?.length ? problem.allowed_languages : null;
    const lang = (chosen_language && (!allowed || allowed.includes(chosen_language)))
      ? chosen_language
      : problem.language;
    if (chosen_language && allowed && !allowed.includes(chosen_language))
      return res.status(400).json({ message: `Language '${chosen_language}' is not allowed for this problem` });

    const sub = await LabSubmission.create({
      problem_id: problem.id, user_id: req.user.id, language: lang,
      source_code, mode: 'submit', status: 'running',
    });

    const io = global._gradingIo;
    if (io) io.to(`user:${req.user.id}`).emit('lab:running', { submission_id: sub.id });
    res.json({ submission_id: sub.id, status: 'running' });

    setImmediate(async () => {
      try {
        const tl = (problem.time_limit_s || 10) * 1000;
        const result = await runLabCode(lang, source_code, problem, tl, 'submit');

        const passed = result.passed || 0;
        const total  = result.total  || 0;
        const score  = total > 0 ? (passed / total) * problem.marks : 0;
        const status = result.compile_error ? 'error' : (result.timeout ? 'timeout' : (passed === total && total > 0 ? 'passed' : 'failed'));

        await sub.update({
          status,
          compile_error: result.compile_error || null,
          results: result.results || [],
          waveform_vcd: result.waveform_vcd || null,
          stdout: result.stdout || null,
          runtime_ms: result.runtime_ms || 0,
          passed_cases: passed,
          total_cases: total,
          score,
        });

        if (io) {
          io.to(`user:${req.user.id}`).emit('lab:result', publicizeResultPayload({
            submission_id: sub.id, mode: 'submit', status,
            compile_error: result.compile_error,
            results: safeResults(result.results),
            waveform_vcd: result.waveform_vcd,
            stdout: result.stdout,
            passed, total, runtime_ms: result.runtime_ms, score,
            reward_points: status === 'passed' ? problem.reward_points : 0,
            medal_image_url: status === 'passed' ? problem.medal_image_url : null,
          }));
        }
      } catch (err) {
        console.error('Lab submit error:', err);
        await sub.update({ status: 'error', compile_error: err.message });
        if (io) io.to(`user:${req.user.id}`).emit('lab:result', publicizeResultPayload({ submission_id: sub.id, mode: 'submit', status: 'error', compile_error: err.message }));
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

// POST /api/lab/run-free
exports.runFree = async (req, res) => {
  try {
    const { language, source_code, stdin } = req.body;
    if (!language || !source_code) return res.status(400).json({ message: 'language and source_code required' });
    const result = await runFreeCode(language, source_code, stdin || '', 15000);
    res.json({
      ...result,
      compile_error: result.compile_error ? publicErrorMessage(result.compile_error) : null,
      stderr: result.stderr ? publicErrorMessage(result.stderr) : '',
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

// GET /api/lab/submissions/:id
exports.getSubmission = async (req, res) => {
  try {
    const where = { id: req.params.id };
    if (req.user.role === 'student') where.user_id = req.user.id;
    const sub = await LabSubmission.findOne({ where });
    if (!sub) return res.status(404).json({ message: 'Submission not found' });
    // Strip hidden details for students
    if (req.user.role === 'student') {
      const safe = sub.toJSON();
      safe.results = safeResults(safe.results);
      return res.json({ submission: publicizeResultPayload(safe) });
    }
    res.json({ submission: sub });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

// GET /api/lab/problems/:id/my-submissions
exports.mySubmissions = async (req, res) => {
  try {
    const subs = await LabSubmission.findAll({
      where: { problem_id: req.params.id, user_id: req.user.id },
      order: [['submitted_at', 'DESC']],
      limit: 10,
      attributes: { exclude: ['source_code', 'waveform_vcd', 'results', 'passed_cases', 'total_cases', 'compile_error'] },
    });
    res.json({ submissions: subs });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

// GET /api/lab/health
exports.health = async (req, res) => {
  try {
    const compilers = await checkCompilers();
    res.json({ compilers });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

// POST /api/lab/seed
exports.seedProblems = async (req, res) => {
  try {
    const createdBy = req.user.id;

    const seeds = [
      // ── VERILOG ──────────────────────────────────────────────────────────
      {
        title: 'AND Gate', language: 'verilog', category: 'gates', difficulty: 'easy', level: 1, marks: 10,
        description: 'Design a 2-input AND gate. Output y should be 1 only when both inputs a and b are 1.',
        starter_code: `module and_gate(\n  input a,\n  input b,\n  output y\n);\n  // Write your code here\nendmodule`,
        testbench: `module tb;\n  reg a, b;\n  wire y;\n  and_gate uut(.a(a),.b(b),.y(y));\n  initial begin\n    $dumpfile("dump.vcd");\n    $dumpvars(0, tb);\n    a=0;b=0;#10;\n    if(y===0) $display("PASS: 0 AND 0 = 0");\n    else $display("FAIL: 0 AND 0 | expected=0 got=%0b",y);\n    a=0;b=1;#10;\n    if(y===0) $display("PASS: 0 AND 1 = 0");\n    else $display("FAIL: 0 AND 1 | expected=0 got=%0b",y);\n    a=1;b=0;#10;\n    if(y===0) $display("PASS: 1 AND 0 = 0");\n    else $display("FAIL: 1 AND 0 | expected=0 got=%0b",y);\n    a=1;b=1;#10;\n    if(y===1) $display("PASS: 1 AND 1 = 1");\n    else $display("FAIL: 1 AND 1 | expected=1 got=%0b",y);\n    $finish;\n  end\nendmodule`,
        visible_test_cases: [{a:0,b:0,y:0},{a:1,b:1,y:1}],
      },
      {
        title: 'OR Gate', language: 'verilog', category: 'gates', difficulty: 'easy', level: 1, marks: 10,
        description: 'Design a 2-input OR gate. Output y should be 1 when at least one input is 1.',
        starter_code: `module or_gate(\n  input a,\n  input b,\n  output y\n);\n  // Write your code here\nendmodule`,
        testbench: `module tb;\n  reg a, b;\n  wire y;\n  or_gate uut(.a(a),.b(b),.y(y));\n  initial begin\n    $dumpfile("dump.vcd");\n    $dumpvars(0, tb);\n    a=0;b=0;#10;\n    if(y===0) $display("PASS: 0 OR 0 = 0");\n    else $display("FAIL: 0 OR 0 | expected=0 got=%0b",y);\n    a=0;b=1;#10;\n    if(y===1) $display("PASS: 0 OR 1 = 1");\n    else $display("FAIL: 0 OR 1 | expected=1 got=%0b",y);\n    a=1;b=0;#10;\n    if(y===1) $display("PASS: 1 OR 0 = 1");\n    else $display("FAIL: 1 OR 0 | expected=1 got=%0b",y);\n    a=1;b=1;#10;\n    if(y===1) $display("PASS: 1 OR 1 = 1");\n    else $display("FAIL: 1 OR 1 | expected=1 got=%0b",y);\n    $finish;\n  end\nendmodule`,
        visible_test_cases: [{a:0,b:0,y:0},{a:1,b:1,y:1}],
      },
      {
        title: 'Half Adder', language: 'verilog', category: 'combinational', difficulty: 'easy', level: 2, marks: 15,
        description: 'Design a half adder with inputs a, b and outputs sum, carry.',
        starter_code: `module half_adder(\n  input a,\n  input b,\n  output sum,\n  output carry\n);\n  // Write your code here\nendmodule`,
        testbench: `module tb;\n  reg a, b;\n  wire sum, carry;\n  half_adder uut(.a(a),.b(b),.sum(sum),.carry(carry));\n  initial begin\n    $dumpfile("dump.vcd");\n    $dumpvars(0, tb);\n    a=0;b=0;#10;\n    if(sum===0&&carry===0) $display("PASS: 0+0");\n    else $display("FAIL: 0+0 got sum=%0b carry=%0b",sum,carry);\n    a=0;b=1;#10;\n    if(sum===1&&carry===0) $display("PASS: 0+1");\n    else $display("FAIL: 0+1 got sum=%0b carry=%0b",sum,carry);\n    a=1;b=0;#10;\n    if(sum===1&&carry===0) $display("PASS: 1+0");\n    else $display("FAIL: 1+0 got sum=%0b carry=%0b",sum,carry);\n    a=1;b=1;#10;\n    if(sum===0&&carry===1) $display("PASS: 1+1");\n    else $display("FAIL: 1+1 got sum=%0b carry=%0b",sum,carry);\n    $finish;\n  end\nendmodule`,
        visible_test_cases: [{a:0,b:0,sum:0,carry:0},{a:1,b:1,sum:0,carry:1}],
      },
      {
        title: 'D Flip-Flop', language: 'verilog', category: 'sequential', difficulty: 'medium', level: 3, marks: 20,
        description: 'Design a positive-edge triggered D flip-flop with synchronous reset.',
        starter_code: `module d_ff(\n  input clk,\n  input rst,\n  input d,\n  output reg q\n);\n  // Write your code here\nendmodule`,
        testbench: `module tb;\n  reg clk,rst,d;\n  wire q;\n  d_ff uut(.clk(clk),.rst(rst),.d(d),.q(q));\n  initial clk=0;\n  always #5 clk=~clk;\n  initial begin\n    $dumpfile("dump.vcd");\n    $dumpvars(0,tb);\n    rst=1;d=0;#20;\n    if(q===0) $display("PASS: reset q=0");\n    else $display("FAIL: reset got=%0b",q);\n    rst=0;d=1;#10;\n    if(q===1) $display("PASS: d=1 captured");\n    else $display("FAIL: d=1 got=%0b",q);\n    d=0;#10;\n    if(q===0) $display("PASS: d=0 captured");\n    else $display("FAIL: d=0 got=%0b",q);\n    $finish;\n  end\nendmodule`,
        visible_test_cases: [{rst:1,d:0,q:0},{rst:0,d:1,q:1}],
      },
      // ── VHDL ─────────────────────────────────────────────────────────────
      {
        title: 'AND Gate VHDL', language: 'vhdl', category: 'gates', difficulty: 'easy', level: 1, marks: 10,
        description: 'Design a 2-input AND gate in VHDL.',
        starter_code: `library IEEE;\nuse IEEE.STD_LOGIC_1164.ALL;\nentity and_gate is\n  Port (\n    a : in  STD_LOGIC;\n    b : in  STD_LOGIC;\n    y : out STD_LOGIC\n  );\nend and_gate;\narchitecture Behavioral of and_gate is\nbegin\n  -- Write your code here\nend Behavioral;`,
        testbench: `library IEEE;\nuse IEEE.STD_LOGIC_1164.ALL;\nentity tb is\nend tb;\narchitecture sim of tb is\n  component and_gate port(a,b:in STD_LOGIC; y:out STD_LOGIC); end component;\n  signal a,b,y: STD_LOGIC;\nbegin\n  uut: and_gate port map(a=>a,b=>b,y=>y);\n  process\n  begin\n    a<='0';b<='0';wait for 10 ns;\n    if y='0' then report "PASS: 0 AND 0 = 0"; else report "FAIL: 0 AND 0"; end if;\n    a<='1';b<='1';wait for 10 ns;\n    if y='1' then report "PASS: 1 AND 1 = 1"; else report "FAIL: 1 AND 1"; end if;\n    a<='1';b<='0';wait for 10 ns;\n    if y='0' then report "PASS: 1 AND 0 = 0"; else report "FAIL: 1 AND 0"; end if;\n    wait;\n  end process;\nend sim;`,
        visible_test_cases: [{a:0,b:0,y:0},{a:1,b:1,y:1}],
      },
      {
        title: 'Half Adder VHDL', language: 'vhdl', category: 'combinational', difficulty: 'easy', level: 2, marks: 15,
        description: 'Design a half adder in VHDL with inputs a, b and outputs sum, carry.',
        starter_code: `library IEEE;\nuse IEEE.STD_LOGIC_1164.ALL;\nentity half_adder is\n  Port (\n    a     : in  STD_LOGIC;\n    b     : in  STD_LOGIC;\n    sum   : out STD_LOGIC;\n    carry : out STD_LOGIC\n  );\nend half_adder;\narchitecture Behavioral of half_adder is\nbegin\n  -- Write your code here\nend Behavioral;`,
        testbench: `library IEEE;\nuse IEEE.STD_LOGIC_1164.ALL;\nentity tb is\nend tb;\narchitecture sim of tb is\n  component half_adder port(a,b:in STD_LOGIC; sum,carry:out STD_LOGIC); end component;\n  signal a,b,sum,carry: STD_LOGIC;\nbegin\n  uut: half_adder port map(a=>a,b=>b,sum=>sum,carry=>carry);\n  process\n  begin\n    a<='1';b<='1';wait for 10 ns;\n    if sum='0' and carry='1' then report "PASS: 1+1"; else report "FAIL: 1+1"; end if;\n    a<='0';b<='1';wait for 10 ns;\n    if sum='1' and carry='0' then report "PASS: 0+1"; else report "FAIL: 0+1"; end if;\n    a<='0';b<='0';wait for 10 ns;\n    if sum='0' and carry='0' then report "PASS: 0+0"; else report "FAIL: 0+0"; end if;\n    wait;\n  end process;\nend sim;`,
        visible_test_cases: [{a:1,b:1,sum:0,carry:1}],
      },
      // ── C ────────────────────────────────────────────────────────────────
      {
        title: 'Sum of Two Numbers', language: 'c', category: 'basics', difficulty: 'easy', level: 1, marks: 5,
        description: 'Read two integers from stdin and print their sum.',
        starter_code: `#include <stdio.h>\nint main() {\n    int a, b;\n    scanf("%d %d", &a, &b);\n    // Write your code here\n    return 0;\n}`,
        test_cases: [{stdin:'3 5',expected_output:'8'},{stdin:'0 0',expected_output:'0'}],
        hidden_test_cases: [{stdin:'100 200',expected_output:'300'},{stdin:'-5 5',expected_output:'0'},{stdin:'999 1',expected_output:'1000'}],
      },
      {
        title: 'Fibonacci Nth Term', language: 'c', category: 'recursion', difficulty: 'medium', level: 2, marks: 10,
        description: 'Read n and print the nth Fibonacci number (0-indexed: fib(0)=0, fib(1)=1).',
        starter_code: `#include <stdio.h>\nint fib(int n) {\n    // Write your code here\n    return 0;\n}\nint main() {\n    int n;\n    scanf("%d", &n);\n    printf("%d\\n", fib(n));\n    return 0;\n}`,
        test_cases: [{stdin:'0',expected_output:'0'},{stdin:'1',expected_output:'1'}],
        hidden_test_cases: [{stdin:'7',expected_output:'13'},{stdin:'10',expected_output:'55'},{stdin:'12',expected_output:'144'}],
      },
      {
        title: 'Reverse String', language: 'c', category: 'strings', difficulty: 'easy', level: 1, marks: 5,
        description: 'Read a string and print it reversed.',
        starter_code: `#include <stdio.h>\n#include <string.h>\nint main() {\n    char s[1000];\n    scanf("%s", s);\n    // Write your code here\n    return 0;\n}`,
        test_cases: [{stdin:'hello',expected_output:'olleh'},{stdin:'a',expected_output:'a'}],
        hidden_test_cases: [{stdin:'abcde',expected_output:'edcba'},{stdin:'racecar',expected_output:'racecar'},{stdin:'ab',expected_output:'ba'}],
      },
      // ── C++ ──────────────────────────────────────────────────────────────
      {
        title: 'Reverse String C++', language: 'cpp', category: 'strings', difficulty: 'easy', level: 1, marks: 5,
        description: 'Read a string and print it reversed.',
        starter_code: `#include <iostream>\n#include <algorithm>\nusing namespace std;\nint main() {\n    string s;\n    cin >> s;\n    // Write your code here\n    return 0;\n}`,
        test_cases: [{stdin:'hello',expected_output:'olleh'}],
        hidden_test_cases: [{stdin:'world',expected_output:'dlrow'},{stdin:'abcde',expected_output:'edcba'},{stdin:'z',expected_output:'z'}],
      },
      {
        title: 'Stack using Class', language: 'cpp', category: 'OOP', difficulty: 'medium', level: 2, marks: 15,
        description: 'Implement a stack class. Read n operations: PUSH x or POP. For each POP print the popped value or -1 if empty.',
        starter_code: `#include <iostream>\nusing namespace std;\nclass Stack {\n    // Write your implementation here\npublic:\n    void push(int x) {}\n    int pop() { return -1; }\n};\nint main() {\n    Stack st;\n    int n; cin >> n;\n    while(n--) {\n        string op; cin >> op;\n        if(op == "PUSH") { int x; cin >> x; st.push(x); }\n        else cout << st.pop() << "\\n";\n    }\n    return 0;\n}`,
        test_cases: [{stdin:'2\nPOP\nPUSH 1',expected_output:'-1'}],
        hidden_test_cases: [{stdin:'4\nPUSH 5\nPUSH 3\nPOP\nPOP',expected_output:'3\n5'},{stdin:'3\nPUSH 10\nPOP\nPOP',expected_output:'10\n-1'}],
      },
      // ── Python ───────────────────────────────────────────────────────────
      {
        title: 'List Sum', language: 'python', category: 'basics', difficulty: 'easy', level: 1, marks: 5,
        description: 'Read integers on one line separated by spaces and print their sum.',
        starter_code: `nums = list(map(int, input().split()))\n# Write your code here`,
        test_cases: [{stdin:'1 2 3 4 5',expected_output:'15'}],
        hidden_test_cases: [{stdin:'10 20',expected_output:'30'},{stdin:'0',expected_output:'0'},{stdin:'-1 1',expected_output:'0'}],
      },
      {
        title: 'Palindrome Check', language: 'python', category: 'strings', difficulty: 'easy', level: 1, marks: 5,
        description: 'Read a string and print "YES" if it is a palindrome, else "NO".',
        starter_code: `s = input()\n# Write your code here`,
        test_cases: [{stdin:'racecar',expected_output:'YES'},{stdin:'hello',expected_output:'NO'}],
        hidden_test_cases: [{stdin:'madam',expected_output:'YES'},{stdin:'abc',expected_output:'NO'},{stdin:'a',expected_output:'YES'}],
      },
      {
        title: 'Binary Search', language: 'python', category: 'algorithms', difficulty: 'medium', level: 2, marks: 10,
        description: 'Read n, then n sorted integers, then a target. Print the 0-based index or -1 if not found.',
        starter_code: `n = int(input())\narr = list(map(int, input().split()))\ntarget = int(input())\n# Write binary search here`,
        test_cases: [{stdin:'5\n1 3 5 7 9\n5',expected_output:'2'}],
        hidden_test_cases: [{stdin:'5\n1 3 5 7 9\n4',expected_output:'-1'},{stdin:'3\n2 4 6\n6',expected_output:'2'},{stdin:'1\n7\n7',expected_output:'0'}],
      },
      // ── Java ─────────────────────────────────────────────────────────────
      {
        title: 'Hello World Java', language: 'java', category: 'basics', difficulty: 'easy', level: 1, marks: 5,
        description: 'Print "Hello, World!" to stdout.',
        starter_code: `public class Solution {\n    public static void main(String[] args) {\n        // Write your code here\n    }\n}`,
        test_cases: [{stdin:'',expected_output:'Hello, World!'}],
        hidden_test_cases: [],
      },
      {
        title: 'Factorial', language: 'java', category: 'recursion', difficulty: 'easy', level: 1, marks: 5,
        description: 'Read n and print n! (factorial). n <= 12.',
        starter_code: `import java.util.Scanner;\npublic class Solution {\n    static long factorial(int n) {\n        // Write your code here\n        return 0;\n    }\n    public static void main(String[] args) {\n        Scanner sc = new Scanner(System.in);\n        int n = sc.nextInt();\n        System.out.println(factorial(n));\n    }\n}`,
        test_cases: [{stdin:'5',expected_output:'120'},{stdin:'0',expected_output:'1'}],
        hidden_test_cases: [{stdin:'10',expected_output:'3628800'},{stdin:'12',expected_output:'479001600'},{stdin:'1',expected_output:'1'}],
      },
      {
        title: 'Linked List Java', language: 'java', category: 'data structures', difficulty: 'medium', level: 3, marks: 20,
        description: 'Read n integers and print them in reverse order.',
        starter_code: `import java.util.Scanner;\npublic class Solution {\n    static class Node { int val; Node next; Node(int v){val=v;} }\n    public static void main(String[] args) {\n        Scanner sc = new Scanner(System.in);\n        int n = sc.nextInt();\n        Node head = null;\n        for(int i=0;i<n;i++) {\n            int v = sc.nextInt();\n            // Build linked list here\n        }\n        // Print in reverse\n    }\n}`,
        test_cases: [{stdin:'3\n10 20 30',expected_output:'30 20 10'}],
        hidden_test_cases: [{stdin:'5\n1 2 3 4 5',expected_output:'5 4 3 2 1'},{stdin:'1\n42',expected_output:'42'}],
      },
      // ── Embedded C ───────────────────────────────────────────────────────
      {
        title: 'LED Blink Simulation', language: 'embedded_c', category: 'GPIO', difficulty: 'easy', level: 1, marks: 10,
        description: 'Simulate LED blink: print "LED ON" then "LED OFF" 3 times.',
        starter_code: `#include <stdio.h>\n#define LED_ON()  printf("LED ON\\n")\n#define LED_OFF() printf("LED OFF\\n")\nint main(void) {\n    // Write your code here - blink LED 3 times\n    return 0;\n}`,
        test_cases: [{stdin:'',expected_output:'LED ON\nLED OFF\nLED ON\nLED OFF\nLED ON\nLED OFF'}],
        hidden_test_cases: [],
      },
      {
        title: 'UART Print Simulation', language: 'embedded_c', category: 'communication', difficulty: 'medium', level: 2, marks: 15,
        description: 'Simulate UART: read a string from stdin and print it with "UART: " prefix.',
        starter_code: `#include <stdio.h>\nvoid uart_print(const char* msg) {\n    // Write your code here\n}\nint main(void) {\n    char buf[256];\n    scanf("%255s", buf);\n    uart_print(buf);\n    return 0;\n}`,
        test_cases: [{stdin:'Hello',expected_output:'UART: Hello'}],
        hidden_test_cases: [{stdin:'CrackFlow',expected_output:'UART: CrackFlow'},{stdin:'Test123',expected_output:'UART: Test123'}],
      },
    ];

    let created = 0;
    for (const seed of seeds) {
      const [, wasCreated] = await LabProblem.findOrCreate({
        where: { title: seed.title, language: seed.language },
        defaults: { ...seed, created_by: createdBy },
      });
      if (wasCreated) created++;
    }

    res.json({ message: `Seeded ${created} new problems (${seeds.length - created} already existed)`, total: seeds.length, created });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};
