const { AuditLog, QuestionBank, Question, QuestionOption, TestCase, User } = require('../models');
const { Op } = require('sequelize');
const { OBJECTIVE_TYPES, sanitizeObjectiveQuestion, gradeObjectiveQuestion } = require('../utils/objectiveBankGrading');

const ENG_LAB_CATEGORY = 'engineering_lab_objective';

const qInclude = [
  { model: QuestionOption, as: 'options', order: [['order_index', 'ASC']] },
  { model: TestCase, as: 'test_cases' },
];

const bankScope = (id, userRole) => ({
  id,
  category: ENG_LAB_CATEGORY,
  ...(userRole === 'student' ? { is_archived: false, status: 'published' } : {}),
});

// ── List banks ────────────────────────────────────────────────────────────────
exports.listBanks = async (req, res) => {
  try {
    const where = { is_archived: false, category: ENG_LAB_CATEGORY };
    if (req.user.role === 'student') where.status = 'published';

    const banks = await QuestionBank.findAll({
      where,
      include: [{ model: User, as: 'creator', attributes: ['id', 'name'] }],
      order: [['created_at', 'DESC']],
    });

    const result = await Promise.all(banks.map(async (b) => {
      const count = await Question.count({ where: { bank_id: b.id } });
      return { ...b.toJSON(), question_count: count };
    }));

    res.json({ banks: result });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ── Get single bank + all questions ──────────────────────────────────────────
exports.getBank = async (req, res) => {
  try {
    const bank = await QuestionBank.findOne({ where: bankScope(req.params.id, req.user.role),
      include: [{ model: User, as: 'creator', attributes: ['id', 'name'] }],
    });
    if (!bank) return res.status(404).json({ message: 'Bank not found' });

    const studentView = req.user.role === 'student';
    const questions = await Question.findAll({
      where: {
        bank_id: bank.id,
        ...(studentView ? { type: { [Op.in]: [...OBJECTIVE_TYPES] } } : {}),
      },
      include: studentView
        ? [{ model: QuestionOption, as: 'options', attributes: ['id', 'option_text', 'order_index'] }]
        : qInclude,
      order: [['created_at', 'ASC']],
    });

    const enriched = questions.map((q) => {
      if (studentView) return sanitizeObjectiveQuestion(q);
      const json = q.toJSON();
      if (json.type === 'fill_blank' && json.options?.length) {
        json.answer_text = json.options[0].option_text || '';
      }
      return json;
    });

    res.json({ bank, questions: enriched });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ── Create bank ───────────────────────────────────────────────────────────────
exports.createBank = async (req, res) => {
  try {
    const { name, description, bank_type = 'mixed' } = req.body;
    if (!name?.trim()) return res.status(400).json({ message: 'name is required' });

    const bank = await QuestionBank.create({
      name,
      description,
      bank_type,
      category: ENG_LAB_CATEGORY,
      tags: [],
      org_id: req.user.org_id,
      created_by: req.user.id,
      status: 'published',
    });
    res.status(201).json({ bank });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ── Update bank ───────────────────────────────────────────────────────────────
exports.updateBank = async (req, res) => {
  try {
    const bank = await QuestionBank.findOne({ where: bankScope(req.params.id, req.user.role) });
    if (!bank) return res.status(404).json({ message: 'Bank not found' });
    const { name, description, bank_type } = req.body;
    await bank.update({ name, description, bank_type });
    res.json({ bank });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ── Delete (archive) bank ─────────────────────────────────────────────────────
exports.deleteBank = async (req, res) => {
  try {
    const bank = await QuestionBank.findOne({ where: bankScope(req.params.id, req.user.role) });
    if (!bank) return res.status(404).json({ message: 'Bank not found' });
    await bank.update({ is_archived: true });
    res.json({ message: 'Bank archived' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ── List questions ────────────────────────────────────────────────────────────
exports.listQuestions = async (req, res) => {
  try {
    const bank = await QuestionBank.findOne({ where: bankScope(req.params.id, req.user.role) });
    if (!bank) return res.status(404).json({ message: 'Bank not found' });

    const { search, type, difficulty } = req.query;
    const where = { bank_id: req.params.id };
    const studentView = req.user.role === 'student';
    if (studentView) {
      if (type && !OBJECTIVE_TYPES.has(type)) {
        return res.status(400).json({ message: 'Unsupported objective question type' });
      }
      where.type = type || { [Op.in]: [...OBJECTIVE_TYPES] };
    } else if (type) {
      where.type = type;
    }
    if (difficulty) where.difficulty = difficulty;
    if (search) where.title = { [Op.like]: `%${search}%` };

    const questions = await Question.findAll({
      where,
      include: studentView
        ? [{ model: QuestionOption, as: 'options', attributes: ['id', 'option_text', 'order_index'] }]
        : qInclude,
      order: [['created_at', 'ASC']],
    });

    const enriched = questions.map((q) => {
      if (studentView) return sanitizeObjectiveQuestion(q);
      const json = q.toJSON();
      if (json.type === 'fill_blank' && json.options?.length) {
        json.answer_text = json.options[0].option_text || '';
      }
      return json;
    });

    res.json({ questions: enriched });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ── Add question ──────────────────────────────────────────────────────────────
exports.addQuestion = async (req, res) => {
  try {
    const bank = await QuestionBank.findOne({ where: bankScope(req.params.id, req.user.role) });
    if (!bank) return res.status(404).json({ message: 'Bank not found' });

    const {
      type, title, body, difficulty = 'medium', marks = 1, negative_marks = 0,
      tags, explanation, options = [],
    } = req.body;

    if (!title?.trim()) return res.status(400).json({ message: 'title is required' });
    if (!type) return res.status(400).json({ message: 'type is required' });

    const question = await Question.create({
      bank_id: bank.id,
      org_id: req.user.org_id,
      created_by: req.user.id,
      type,
      title,
      body: body || null,
      difficulty,
      marks: parseFloat(marks) || 1,
      negative_marks: parseFloat(negative_marks) || 0,
      tags: Array.isArray(tags) ? tags : [],
      explanation: explanation || null,
      approval_status: 'approved',
    });

    if (options.length) {
      await QuestionOption.bulkCreate(
        options.map((o, i) => ({
          question_id: question.id,
          option_text: o.option_text,
          is_correct: !!o.is_correct,
          order_index: i,
        }))
      );
    }

    const full = await Question.findByPk(question.id, { include: qInclude });
    const json = full.toJSON();
    if (json.type === 'fill_blank' && json.options?.length) {
      json.answer_text = json.options[0].option_text || '';
    }
    res.status(201).json({ question: json });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ── Update question ───────────────────────────────────────────────────────────
exports.updateQuestion = async (req, res) => {
  try {
    const bank = await QuestionBank.findOne({ where: bankScope(req.params.id, req.user.role) });
    if (!bank) return res.status(404).json({ message: 'Bank not found' });
    const question = await Question.findOne({
      where: { id: req.params.qId, bank_id: req.params.id },
    });
    if (!question) return res.status(404).json({ message: 'Question not found' });

    const {
      type, title, body, difficulty, marks, negative_marks,
      tags, explanation, options = [],
    } = req.body;

    await question.update({
      type,
      title,
      body: body || null,
      difficulty,
      marks: parseFloat(marks) || question.marks,
      negative_marks: parseFloat(negative_marks) ?? question.negative_marks,
      tags: Array.isArray(tags) ? tags : question.tags,
      explanation: explanation || null,
    });

    await QuestionOption.destroy({ where: { question_id: question.id } });
    if (options.length) {
      await QuestionOption.bulkCreate(
        options.map((o, i) => ({
          question_id: question.id,
          option_text: o.option_text,
          is_correct: !!o.is_correct,
          order_index: i,
        }))
      );
    }

    const full = await Question.findByPk(question.id, { include: qInclude });
    const json = full.toJSON();
    if (json.type === 'fill_blank' && json.options?.length) {
      json.answer_text = json.options[0].option_text || '';
    }
    res.json({ question: json });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ── Delete question ───────────────────────────────────────────────────────────
exports.deleteQuestion = async (req, res) => {
  try {
    const bank = await QuestionBank.findOne({ where: bankScope(req.params.id, req.user.role) });
    if (!bank) return res.status(404).json({ message: 'Bank not found' });
    const question = await Question.findOne({
      where: { id: req.params.qId, bank_id: req.params.id },
    });
    if (!question) return res.status(404).json({ message: 'Question not found' });
    await question.destroy();
    res.json({ message: 'Question deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ── Submit and grade an objective bank attempt ────────────────────────────────
exports.submitAttempt = async (req, res) => {
  try {
    const body = req.body || {};
    const acceptedFields = new Set(['question_ids', 'answers', 'elapsed_seconds']);
    const unsupportedField = Object.keys(body).find((field) => !acceptedFields.has(field));
    if (unsupportedField) return res.status(400).json({ message: `Unsupported attempt field: ${unsupportedField}` });
    const { question_ids, answers = {}, elapsed_seconds = 0 } = body;
    if (!Array.isArray(question_ids) || question_ids.length < 1 || question_ids.length > 100) {
      return res.status(400).json({ message: 'question_ids must contain between 1 and 100 question IDs' });
    }
    if (question_ids.some((id) => typeof id !== 'string' || !id.trim()) || new Set(question_ids).size !== question_ids.length) {
      return res.status(400).json({ message: 'question_ids must contain unique, non-empty IDs' });
    }
    if (!answers || typeof answers !== 'object' || Array.isArray(answers)) {
      return res.status(400).json({ message: 'answers must be an object keyed by question ID' });
    }
    if (!Number.isInteger(elapsed_seconds) || elapsed_seconds < 0 || elapsed_seconds > 86400) {
      return res.status(400).json({ message: 'elapsed_seconds must be an integer between 0 and 86400' });
    }
    if (Object.keys(answers).some((id) => !question_ids.includes(id))) {
      return res.status(400).json({ message: 'answers contains a question not included in question_ids' });
    }

    const bank = await QuestionBank.findOne({
      where: { ...bankScope(req.params.id, req.user.role), is_archived: false },
    });
    if (!bank) return res.status(404).json({ message: 'Bank not found' });

    const questions = await Question.findAll({
      where: { bank_id: bank.id, id: { [Op.in]: question_ids } },
      include: [{ model: QuestionOption, as: 'options', attributes: ['id', 'option_text', 'is_correct', 'order_index'] }],
      order: [['created_at', 'ASC']],
    });
    if (questions.length !== question_ids.length) {
      return res.status(400).json({ message: 'Every question must belong to this bank' });
    }

    const questionById = new Map(questions.map((question) => [question.id, question]));
    const gradedResults = [];
    let score = 0;
    let maxScore = 0;
    for (const questionId of question_ids) {
      const question = questionById.get(questionId).toJSON();
      if (!['mcq_single', 'mcq_multi', 'true_false', 'fill_blank'].includes(question.type)) {
        return res.status(409).json({ message: 'This bank contains a question type that cannot be graded by this endpoint' });
      }
      const questionOptions = question.options || [];
      const answer = answers[questionId];
      if (question.type === 'fill_blank') {
        if (answer !== undefined && (typeof answer !== 'string' || answer.length > 500)) {
          return res.status(400).json({ message: 'Text answers must be strings of at most 500 characters' });
        }
      } else if (question.type === 'mcq_multi') {
        if (answer !== undefined && (!Array.isArray(answer) || answer.length > questionOptions.length || answer.some((id) => typeof id !== 'string'))) {
          return res.status(400).json({ message: 'Multiple-choice answers must be an array of option IDs' });
        }
      } else if (answer !== undefined && answer !== null && typeof answer !== 'string') {
        return res.status(400).json({ message: 'Single-choice answers must be an option ID' });
      }

      if (question.type !== 'fill_blank') {
        const selectedIds = Array.isArray(answer) ? answer : (typeof answer === 'string' ? [answer] : []);
        if (new Set(selectedIds).size !== selectedIds.length || selectedIds.some((id) => !questionOptions.some((option) => option.id === id))) {
          return res.status(400).json({ message: 'An answer contains a duplicate or invalid option ID' });
        }
      }

      let grade;
      try {
        grade = gradeObjectiveQuestion(question, answer);
      } catch (error) {
        console.error('Invalid objective question configuration:', error.message);
        return res.status(409).json({ message: 'A question in this bank is not configured for grading' });
      }
      const marks = Number(question.marks);
      if (!Number.isFinite(marks) || marks <= 0) {
        return res.status(409).json({ message: 'A question in this bank has invalid marks' });
      }
      const marksAwarded = grade.correct ? marks : 0;
      maxScore += marks;
      score += marksAwarded;
      gradedResults.push({
        question_id: question.id,
        correct: grade.correct,
        marks,
        marks_awarded: marksAwarded,
        correct_option_ids: grade.correct_option_ids,
        correct_answer_text: grade.correct_answer_text,
        explanation: question.explanation || null,
      });
    }

    const auditEntry = await AuditLog.create({
      user_id: req.user.id,
      action: 'OBJ_BANK_ATTEMPT',
      module: 'question_bank',
      target_id: bank.id,
      metadata: {
        score,
        max_score: maxScore,
        correct_count: gradedResults.filter((result) => result.correct).length,
        total_questions: gradedResults.length,
        elapsed_seconds,
      },
    });
    const correctCount = gradedResults.filter((result) => result.correct).length;
    res.status(201).json({
      attempt_id: auditEntry.id,
      score,
      max_score: maxScore,
      score_percent: Math.round((score / maxScore) * 100),
      correct_count: correctCount,
      total_questions: gradedResults.length,
      elapsed_seconds,
      results: gradedResults,
    });
  } catch (err) {
    console.error('Objective bank attempt error:', err);
    res.status(500).json({ message: 'Unable to submit objective bank attempt' });
  }
};

// ── Seed Demo Data ────────────────────────────────────────────────────────────
exports.seedDemoData = async (req, res) => {
  try {
    const img = (seed) => `<p><img src="https://picsum.photos/seed/${seed}/600/280" alt="diagram" style="max-width:100%;border-radius:8px;margin:8px 0" /></p>`;
    const ENG_LAB_CATEGORY = 'engineering_lab_objective';

    const BANKS = [
      {
        name: 'Digital Electronics — MCQ Bank',
        description: 'Logic gates, Boolean algebra, flip-flops, counters and combinational circuits.',
        bank_type: 'mcq_single',
        qs: [
          { type:'mcq_single', title:'What is the output of a NAND gate when both inputs are HIGH?', body:img('nand1'), diff:'easy', marks:1, exp:'NAND = NOT AND. 1 AND 1 = 1, NOT 1 = 0.', opts:[{t:'0',c:true},{t:'1',c:false},{t:'HIGH',c:false},{t:'Undefined',c:false}] },
          { type:'mcq_single', title:'Which gate produces HIGH output only when all inputs are HIGH?', body:'', diff:'easy', marks:1, exp:'AND gate output is HIGH only when all inputs are HIGH.', opts:[{t:'OR',c:false},{t:'AND',c:true},{t:'NOR',c:false},{t:'XOR',c:false}] },
          { type:'mcq_single', title:'The Boolean expression for a NOR gate with inputs A and B is:', body:'', diff:'easy', marks:1, exp:'NOR = NOT(A OR B).', opts:[{t:'A.B',c:false},{t:'A+B',c:false},{t:"(A+B)'",c:true},{t:"(A.B)'",c:false}] },
          { type:'mcq_single', title:'How many flip-flops are needed to build a MOD-16 counter?', body:'', diff:'medium', marks:2, exp:'2^4 = 16, so 4 flip-flops are needed.', opts:[{t:'2',c:false},{t:'3',c:false},{t:'4',c:true},{t:'8',c:false}] },
          { type:'mcq_single', title:'Which flip-flop is known as a divide-by-2 circuit?', body:'', diff:'medium', marks:2, exp:'T flip-flop toggles on every clock edge, dividing frequency by 2.', opts:[{t:'SR',c:false},{t:'JK',c:false},{t:'D',c:false},{t:'T',c:true}] },
          { type:'mcq_single', title:'A full adder has how many inputs?', body:img('adder2'), diff:'easy', marks:1, exp:'Full adder has 3 inputs: A, B, and Carry-in.', opts:[{t:'1',c:false},{t:'2',c:false},{t:'3',c:true},{t:'4',c:false}] },
          { type:'mcq_single', title:'Which logic family has the highest noise immunity?', body:'', diff:'medium', marks:2, exp:'CMOS has the highest noise immunity due to wide noise margins.', opts:[{t:'TTL',c:false},{t:'ECL',c:false},{t:'CMOS',c:true},{t:'DTL',c:false}] },
          { type:'mcq_single', title:'Minimum NAND gates to implement a NOT gate:', body:'', diff:'easy', marks:1, exp:'Connect both inputs of a NAND gate together to get NOT.', opts:[{t:'1',c:true},{t:'2',c:false},{t:'3',c:false},{t:'4',c:false}] },
          { type:'mcq_single', title:'In a JK flip-flop, when J=1 and K=1, the output:', body:'', diff:'medium', marks:2, exp:'J=K=1 causes the JK flip-flop to toggle its output.', opts:[{t:'Sets to 1',c:false},{t:'Resets to 0',c:false},{t:'Toggles',c:true},{t:'Remains unchanged',c:false}] },
          { type:'mcq_single', title:'Which of the following is a universal gate?', body:'', diff:'easy', marks:1, exp:'NAND and NOR are universal gates.', opts:[{t:'AND',c:false},{t:'OR',c:false},{t:'NAND',c:true},{t:'XOR',c:false}] },
          { type:'mcq_single', title:'The output of an XOR gate is HIGH when:', body:'', diff:'easy', marks:1, exp:'XOR is HIGH when inputs are different.', opts:[{t:'Both HIGH',c:false},{t:'Both LOW',c:false},{t:'Inputs differ',c:true},{t:'Inputs same',c:false}] },
          { type:'mcq_single', title:'A 4-to-1 multiplexer has how many select lines?', body:img('mux4'), diff:'medium', marks:2, exp:'4-to-1 MUX needs 2 select lines (2^2=4).', opts:[{t:'1',c:false},{t:'2',c:true},{t:'3',c:false},{t:'4',c:false}] },
          { type:'mcq_single', title:'Which number system uses base 16?', body:'', diff:'easy', marks:1, exp:'Hexadecimal uses base 16 with digits 0-9 and A-F.', opts:[{t:'Binary',c:false},{t:'Octal',c:false},{t:'Decimal',c:false},{t:'Hexadecimal',c:true}] },
          { type:'mcq_single', title:"The 2's complement of 0110 is:", body:'', diff:'medium', marks:2, exp:"1's complement of 0110 = 1001, add 1 = 1010.", opts:[{t:'1001',c:false},{t:'1010',c:true},{t:'0110',c:false},{t:'1110',c:false}] },
        ],
      },
      {
        name: 'VLSI Design — True/False & Fill Blank',
        description: 'CMOS, RTL design, Verilog HDL, timing analysis and FPGA basics.',
        bank_type: 'mixed',
        qs: [
          { type:'true_false', title:'In CMOS logic, both PMOS and NMOS transistors are used.', body:'', diff:'easy', marks:1, exp:'CMOS uses complementary pairs of PMOS and NMOS.', opts:[{t:'True',c:true},{t:'False',c:false}] },
          { type:'true_false', title:'Setup time is the time data must be stable AFTER the clock edge.', body:'', diff:'medium', marks:1, exp:'Setup time is BEFORE the clock edge. Hold time is after.', opts:[{t:'True',c:false},{t:'False',c:true}] },
          { type:'true_false', title:'An FPGA can be reprogrammed after manufacturing.', body:'', diff:'easy', marks:1, exp:'FPGAs are field-programmable and can be reconfigured.', opts:[{t:'True',c:true},{t:'False',c:false}] },
          { type:'true_false', title:'Verilog is a hardware description language.', body:'', diff:'easy', marks:1, exp:'Verilog is an HDL used to model electronic systems.', opts:[{t:'True',c:true},{t:'False',c:false}] },
          { type:'true_false', title:'In synchronous design, all flip-flops share the same clock.', body:'', diff:'easy', marks:1, exp:'Synchronous design uses a single global clock.', opts:[{t:'True',c:true},{t:'False',c:false}] },
          { type:'fill_blank', title:'The keyword used in Verilog to define a module is ___.', body:'', diff:'easy', marks:1, exp:'Every Verilog design starts with the module keyword.', opts:[{t:'module',c:true}] },
          { type:'fill_blank', title:'In CMOS, the pull-up network uses ___ transistors.', body:img('cmos3'), diff:'medium', marks:2, exp:'PMOS transistors form the pull-up network in CMOS.', opts:[{t:'PMOS',c:true}] },
          { type:'fill_blank', title:'The maximum operating frequency is determined by the ___ path.', body:'', diff:'hard', marks:3, exp:'The critical (longest) path determines max clock frequency.', opts:[{t:'critical',c:true}] },
          { type:'fill_blank', title:'A D flip-flop samples input on the ___ edge of the clock by default.', body:'', diff:'medium', marks:2, exp:'D flip-flops are typically positive-edge triggered.', opts:[{t:'rising',c:true}] },
          { type:'fill_blank', title:'The Verilog operator for bitwise AND is ___.', body:'', diff:'easy', marks:1, exp:'& is the bitwise AND operator in Verilog.', opts:[{t:'&',c:true}] },
          { type:'true_false', title:'Hold time violation can be fixed by adding buffers on the data path.', body:'', diff:'hard', marks:2, exp:'Adding buffers increases data path delay, fixing hold violations.', opts:[{t:'True',c:true},{t:'False',c:false}] },
          { type:'true_false', title:'ASIC designs can be reprogrammed after fabrication.', body:'', diff:'easy', marks:1, exp:'ASICs are fixed after fabrication unlike FPGAs.', opts:[{t:'True',c:false},{t:'False',c:true}] },
          { type:'fill_blank', title:'The process of converting RTL to gate-level netlist is called ___.', body:'', diff:'medium', marks:2, exp:'Logic synthesis converts RTL to gate-level netlist.', opts:[{t:'synthesis',c:true}] },
        ],
      },
      {
        name: 'Embedded Systems — MCQ Multi Select',
        description: 'Microcontrollers, GPIO, timers, UART, SPI, I2C and interrupts.',
        bank_type: 'mcq_multi',
        qs: [
          { type:'mcq_multi', title:'Which of the following are serial communication protocols?', body:'', diff:'easy', marks:2, exp:'UART, SPI, and I2C are serial protocols. GPIO is not a protocol.', opts:[{t:'UART',c:true},{t:'SPI',c:true},{t:'I2C',c:true},{t:'GPIO',c:false}] },
          { type:'mcq_multi', title:'Which registers are typically found in a microcontroller?', body:'', diff:'medium', marks:2, exp:'PC, SP, and Status Register are standard MCU registers.', opts:[{t:'Program Counter',c:true},{t:'Stack Pointer',c:true},{t:'Status Register',c:true},{t:'Pixel Register',c:false}] },
          { type:'mcq_multi', title:'Which are valid interrupt types in embedded systems?', body:'', diff:'medium', marks:2, exp:'External, Timer, and UART interrupts are common.', opts:[{t:'External interrupt',c:true},{t:'Timer interrupt',c:true},{t:'UART interrupt',c:true},{t:'Memory interrupt',c:false}] },
          { type:'mcq_multi', title:'Which features are advantages of I2C over SPI?', body:img('i2c4'), diff:'hard', marks:3, exp:'I2C uses fewer wires and supports multiple masters.', opts:[{t:'Fewer wires needed',c:true},{t:'Multi-master support',c:true},{t:'Higher speed',c:false},{t:'Simpler hardware',c:false}] },
          { type:'mcq_multi', title:'Which of the following are true about PWM signals?', body:'', diff:'medium', marks:2, exp:'PWM has variable duty cycle, fixed frequency, used for motor control.', opts:[{t:'Variable duty cycle',c:true},{t:'Fixed frequency',c:true},{t:'Used for motor control',c:true},{t:'Always 50% duty cycle',c:false}] },
          { type:'mcq_multi', title:'Which are valid GPIO modes in a microcontroller?', body:'', diff:'easy', marks:2, exp:'Input, Output, and Alternate Function are standard GPIO modes.', opts:[{t:'Input',c:true},{t:'Output',c:true},{t:'Alternate Function',c:true},{t:'Floating Power',c:false}] },
          { type:'mcq_multi', title:'Which of the following are true about watchdog timers?', body:'', diff:'hard', marks:3, exp:'Watchdog timers reset the system if not refreshed.', opts:[{t:'Resets system if not refreshed',c:true},{t:'Prevents system hangs',c:true},{t:'Runs independently of CPU',c:true},{t:'Increases clock speed',c:false}] },
          { type:'mcq_multi', title:'Which are characteristics of RISC architecture?', body:'', diff:'medium', marks:2, exp:'RISC has fixed instruction length, load/store arch, many registers.', opts:[{t:'Fixed instruction length',c:true},{t:'Load/store architecture',c:true},{t:'Large number of registers',c:true},{t:'Complex addressing modes',c:false}] },
          { type:'mcq_multi', title:'Which of the following are non-volatile memory types?', body:'', diff:'easy', marks:2, exp:'Flash, EEPROM, and ROM retain data without power. SRAM is volatile.', opts:[{t:'Flash',c:true},{t:'EEPROM',c:true},{t:'ROM',c:true},{t:'SRAM',c:false}] },
          { type:'mcq_multi', title:'Which signals are part of the SPI protocol?', body:img('spi5'), diff:'medium', marks:2, exp:'SPI uses MOSI, MISO, SCLK, and CS lines.', opts:[{t:'MOSI',c:true},{t:'MISO',c:true},{t:'SCLK',c:true},{t:'ACK',c:false}] },
          { type:'mcq_multi', title:'Which are true about DMA (Direct Memory Access)?', body:'', diff:'hard', marks:3, exp:'DMA transfers data without CPU, increases throughput.', opts:[{t:'Transfers data without CPU',c:true},{t:'Increases data throughput',c:true},{t:'Reduces CPU load',c:true},{t:'Requires more power',c:false}] },
          { type:'mcq_multi', title:'Which are valid timer modes in embedded systems?', body:'', diff:'medium', marks:2, exp:'Input Capture, Output Compare, and PWM are standard timer modes.', opts:[{t:'Input Capture',c:true},{t:'Output Compare',c:true},{t:'PWM generation',c:true},{t:'Voltage regulation',c:false}] },
        ],
      },
      {
        name: 'Signals & Systems — Mixed Bank',
        description: 'Fourier transform, Laplace, Z-transform, convolution and signal types.',
        bank_type: 'mixed',
        qs: [
          { type:'mcq_single', title:'The Fourier transform of a rectangular pulse is a:', body:img('fourier6'), diff:'medium', marks:2, exp:'The FT of a rect function is a sinc function.', opts:[{t:'Sinc function',c:true},{t:'Gaussian',c:false},{t:'Delta function',c:false},{t:'Step function',c:false}] },
          { type:'mcq_single', title:'Which transform is used for analyzing discrete-time signals?', body:'', diff:'medium', marks:2, exp:'Z-transform is the discrete-time equivalent of Laplace.', opts:[{t:'Laplace',c:false},{t:'Fourier',c:false},{t:'Z-transform',c:true},{t:'Hilbert',c:false}] },
          { type:'mcq_single', title:'A system is causal if its output depends only on:', body:'', diff:'medium', marks:2, exp:'A causal system output depends on present and past inputs only.', opts:[{t:'Future inputs',c:false},{t:'Past and present inputs',c:true},{t:'Future and past inputs',c:false},{t:'Only present input',c:false}] },
          { type:'true_false', title:'Convolution in time domain equals multiplication in frequency domain.', body:'', diff:'medium', marks:2, exp:'This is the convolution theorem of Fourier transforms.', opts:[{t:'True',c:true},{t:'False',c:false}] },
          { type:'true_false', title:'A stable system has all poles inside the unit circle in Z-domain.', body:'', diff:'hard', marks:3, exp:'For discrete-time systems, stability requires poles inside unit circle.', opts:[{t:'True',c:true},{t:'False',c:false}] },
          { type:'fill_blank', title:'The ROC for a causal system is ___ the outermost pole.', body:'', diff:'hard', marks:3, exp:'For causal systems, ROC is outside the outermost pole.', opts:[{t:'outside',c:true}] },
          { type:'mcq_single', title:'The unit impulse function delta(t) has area equal to:', body:'', diff:'easy', marks:1, exp:'By definition, the integral of delta(t) over all time equals 1.', opts:[{t:'0',c:false},{t:'1',c:true},{t:'infinity',c:false},{t:'undefined',c:false}] },
          { type:'mcq_multi', title:'Which of the following are properties of LTI systems?', body:'', diff:'medium', marks:2, exp:'LTI systems are Linear, Time-Invariant, characterized by impulse response.', opts:[{t:'Linearity',c:true},{t:'Time invariance',c:true},{t:'Characterized by impulse response',c:true},{t:'Always stable',c:false}] },
          { type:'fill_blank', title:'The Laplace transform of e^(-at)u(t) is ___.', body:'', diff:'hard', marks:3, exp:'L{e^(-at)u(t)} = 1/(s+a).', opts:[{t:'1/(s+a)',c:true}] },
          { type:'true_false', title:'A periodic signal has infinite energy but finite average power.', body:'', diff:'medium', marks:2, exp:'Periodic signals have infinite energy and finite non-zero average power.', opts:[{t:'True',c:true},{t:'False',c:false}] },
          { type:'mcq_single', title:'Sampling theorem: sampling rate must be at least ___ the signal bandwidth.', body:img('sampling7'), diff:'medium', marks:2, exp:'Nyquist: fs >= 2*fmax to avoid aliasing.', opts:[{t:'Equal to',c:false},{t:'Half of',c:false},{t:'Twice',c:true},{t:'Four times',c:false}] },
          { type:'fill_blank', title:'The process of recovering a signal from its samples is called ___.', body:'', diff:'medium', marks:2, exp:'Reconstruction recovers the original signal from samples.', opts:[{t:'reconstruction',c:true}] },
          { type:'true_false', title:'The DTFT of a finite-length sequence always converges.', body:'', diff:'hard', marks:3, exp:'DTFT of a finite-length sequence always converges since the sum is finite.', opts:[{t:'True',c:true},{t:'False',c:false}] },
          { type:'mcq_multi', title:'Which are properties of the Fourier transform?', body:'', diff:'medium', marks:2, exp:'Linearity, time shifting, and duality are all FT properties.', opts:[{t:'Linearity',c:true},{t:'Time shifting',c:true},{t:'Duality',c:true},{t:'Non-invertibility',c:false}] },
          { type:'mcq_single', title:'The Z-transform of the unit step sequence u[n] is:', body:'', diff:'medium', marks:2, exp:'Z{u[n]} = z/(z-1) for |z|>1.', opts:[{t:'1/(z-1)',c:false},{t:'z/(z-1)',c:true},{t:'1/z',c:false},{t:'z',c:false}] },
          { type:'fill_blank', title:'Aliasing occurs when the sampling rate is ___ than the Nyquist rate.', body:'', diff:'medium', marks:2, exp:'Aliasing occurs when fs < 2*fmax (below Nyquist rate).', opts:[{t:'less',c:true}] },
        ],
      },
    ];

    let totalCreated = 0;
    const report = [];

    for (const bd of BANKS) {
      const [bank, created] = await QuestionBank.findOrCreate({
        where: { name: bd.name, category: ENG_LAB_CATEGORY, org_id: req.user.org_id || null },
        defaults: {
          name: bd.name, description: bd.description, bank_type: bd.bank_type,
          category: ENG_LAB_CATEGORY, tags: [],
          org_id: req.user.org_id || null, created_by: req.user.id, status: 'published',
        },
      });

      if (!created) { report.push({ name: bank.name, skipped: true }); continue; }

      for (const q of bd.qs) {
        const question = await Question.create({
          bank_id: bank.id, org_id: req.user.org_id || null, created_by: req.user.id,
          type: q.type, title: q.title, body: q.body || null,
          difficulty: q.diff, marks: q.marks, negative_marks: 0,
          tags: [], explanation: q.exp || null, approval_status: 'approved',
        });
        await QuestionOption.bulkCreate(
          q.opts.map((o, i) => ({ question_id: question.id, option_text: o.t, is_correct: !!o.c, order_index: i }))
        );
        totalCreated++;
      }
      report.push({ name: bank.name, questions: bd.qs.length });
    }

    res.json({ message: `Seeded ${totalCreated} questions across ${report.filter(b => !b.skipped).length} banks.`, banks: report });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
