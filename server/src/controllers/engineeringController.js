const { Branch, Subject, Topic } = require('../models');

// ── BRANCHES ─────────────────────────────────────────────────────────────────

exports.listBranches = async (req, res) => {
  try {
    const branches = await Branch.findAll({
      where: { is_active: true },
      order: [['name', 'ASC']],
    });
    res.json(branches);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.createBranch = async (req, res) => {
  try {
    const { name, code, description } = req.body;
    if (!name || !code) return res.status(400).json({ message: 'name and code are required' });
    const branch = await Branch.create({ name, code: code.toUpperCase(), description });
    res.status(201).json(branch);
  } catch (err) {
    if (err.name === 'SequelizeUniqueConstraintError')
      return res.status(409).json({ message: 'Branch code already exists' });
    res.status(500).json({ message: err.message });
  }
};

exports.updateBranch = async (req, res) => {
  try {
    const branch = await Branch.findByPk(req.params.id);
    if (!branch) return res.status(404).json({ message: 'Branch not found' });
    await branch.update(req.body);
    res.json(branch);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.deleteBranch = async (req, res) => {
  try {
    const branch = await Branch.findByPk(req.params.id);
    if (!branch) return res.status(404).json({ message: 'Branch not found' });
    await branch.update({ is_active: false });
    res.json({ message: 'Branch deactivated' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ── SUBJECTS ─────────────────────────────────────────────────────────────────

exports.listSubjects = async (req, res) => {
  try {
    const where = { is_active: true };
    if (req.query.branch_id) where.branch_id = req.query.branch_id;
    const subjects = await Subject.findAll({
      where,
      include: [{ model: Branch, as: 'branch', attributes: ['id', 'name', 'code'] }],
      order: [['name', 'ASC']],
    });
    res.json(subjects);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.createSubject = async (req, res) => {
  try {
    const { branch_id, name, code, description } = req.body;
    if (!branch_id || !name) return res.status(400).json({ message: 'branch_id and name are required' });
    const branch = await Branch.findByPk(branch_id);
    if (!branch) return res.status(404).json({ message: 'Branch not found' });
    const subject = await Subject.create({ branch_id, name, code, description });
    res.status(201).json(subject);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.updateSubject = async (req, res) => {
  try {
    const subject = await Subject.findByPk(req.params.id);
    if (!subject) return res.status(404).json({ message: 'Subject not found' });
    await subject.update(req.body);
    res.json(subject);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.deleteSubject = async (req, res) => {
  try {
    const subject = await Subject.findByPk(req.params.id);
    if (!subject) return res.status(404).json({ message: 'Subject not found' });
    await subject.update({ is_active: false });
    res.json({ message: 'Subject deactivated' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ── TOPICS ────────────────────────────────────────────────────────────────────

exports.listTopics = async (req, res) => {
  try {
    const where = { is_active: true };
    if (req.query.subject_id) where.subject_id = req.query.subject_id;
    const topics = await Topic.findAll({
      where,
      include: [{ model: Subject, as: 'subject', attributes: ['id', 'name'] }],
      order: [['order_index', 'ASC'], ['name', 'ASC']],
    });
    res.json(topics);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.createTopic = async (req, res) => {
  try {
    const { subject_id, name, description, order_index } = req.body;
    if (!subject_id || !name) return res.status(400).json({ message: 'subject_id and name are required' });
    const subject = await Subject.findByPk(subject_id);
    if (!subject) return res.status(404).json({ message: 'Subject not found' });
    const topic = await Topic.create({ subject_id, name, description, order_index });
    res.status(201).json(topic);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.updateTopic = async (req, res) => {
  try {
    const topic = await Topic.findByPk(req.params.id);
    if (!topic) return res.status(404).json({ message: 'Topic not found' });
    await topic.update(req.body);
    res.json(topic);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.deleteTopic = async (req, res) => {
  try {
    const topic = await Topic.findByPk(req.params.id);
    if (!topic) return res.status(404).json({ message: 'Topic not found' });
    await topic.update({ is_active: false });
    res.json({ message: 'Topic deactivated' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ── FULL TREE (Branch → Subjects → Topics) ───────────────────────────────────

exports.getTree = async (req, res) => {
  try {
    const branches = await Branch.findAll({
      where: { is_active: true },
      include: [{
        model: Subject,
        as: 'subjects',
        where: { is_active: true },
        required: false,
        include: [{
          model: Topic,
          as: 'topics',
          where: { is_active: true },
          required: false,
          order: [['order_index', 'ASC']],
        }],
      }],
      order: [['name', 'ASC']],
    });
    res.json(branches);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ── SEED DEFAULT ECE DATA ─────────────────────────────────────────────────────

exports.seedDefaults = async (req, res) => {
  try {
    const defaultData = [
      {
        name: 'Electronics & Communication Engineering', code: 'ECE',
        subjects: [
          { name: 'Digital Electronics', code: 'DE', topics: ['Number Systems','Boolean Algebra','Logic Gates','K-Maps','Combinational Circuits','MUX & DEMUX','Encoders & Decoders','Adders & Subtractors','Flip-Flops','Counters','Registers','Finite State Machines'] },
          { name: 'Analog Electronics', code: 'AE', topics: ['Diodes','BJT Biasing','FET','Op-Amp','Oscillators','Filters','Amplifiers'] },
          { name: 'VLSI Design', code: 'VLSI', topics: ['CMOS Basics','Logic Families','Verilog HDL','SystemVerilog','RTL Design','Timing Analysis','FPGA Basics'] },
          { name: 'Embedded Systems', code: 'ES', topics: ['Microcontroller Basics','GPIO','Timers','UART','SPI','I2C','Interrupts','Embedded C'] },
          { name: 'Microprocessors & Microcontrollers', code: 'MP', topics: ['8085 Architecture','8086 Architecture','ARM Cortex','Instruction Set','Assembly Language'] },
          { name: 'Communication Systems', code: 'CS', topics: ['AM Modulation','FM Modulation','Digital Modulation','PCM','Multiplexing','Antennas'] },
          { name: 'Signals & Systems', code: 'SS', topics: ['Continuous Signals','Discrete Signals','Fourier Transform','Laplace Transform','Z-Transform','Convolution'] },
        ],
      },
      {
        name: 'Computer Science Engineering', code: 'CSE',
        subjects: [
          { name: 'Data Structures', code: 'DS', topics: ['Arrays','Linked Lists','Stacks','Queues','Trees','Graphs','Hashing'] },
          { name: 'Algorithms', code: 'ALGO', topics: ['Sorting','Searching','Dynamic Programming','Greedy','Graph Algorithms','Complexity Analysis'] },
          { name: 'Operating Systems', code: 'OS', topics: ['Process Management','Memory Management','File Systems','Scheduling','Deadlocks'] },
          { name: 'Database Management', code: 'DBMS', topics: ['SQL','Normalization','Transactions','Indexing','ER Diagrams'] },
          { name: 'Computer Networks', code: 'CN', topics: ['OSI Model','TCP/IP','Routing','Switching','DNS','HTTP'] },
        ],
      },
      {
        name: 'Electrical & Electronics Engineering', code: 'EEE',
        subjects: [
          { name: 'Circuit Theory', code: 'CT', topics: ['KVL & KCL','Thevenin','Norton','Superposition','AC Circuits'] },
          { name: 'Power Systems', code: 'PS', topics: ['Generation','Transmission','Distribution','Protection','Load Flow'] },
          { name: 'Electrical Machines', code: 'EM', topics: ['DC Machines','Transformers','Induction Motors','Synchronous Machines'] },
        ],
      },
    ];

    let created = 0;
    for (const bd of defaultData) {
      const [branch] = await Branch.findOrCreate({
        where: { code: bd.code },
        defaults: { name: bd.name, code: bd.code },
      });
      for (const sd of bd.subjects) {
        const [subject] = await Subject.findOrCreate({
          where: { branch_id: branch.id, name: sd.name },
          defaults: { branch_id: branch.id, name: sd.name, code: sd.code },
        });
        for (let i = 0; i < sd.topics.length; i++) {
          await Topic.findOrCreate({
            where: { subject_id: subject.id, name: sd.topics[i] },
            defaults: { subject_id: subject.id, name: sd.topics[i], order_index: i },
          });
          created++;
        }
      }
    }
    res.json({ message: `Seed complete. ${created} topics processed.` });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
