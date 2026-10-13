const { EngLabFolder, QuestionBank, Question, User } = require('../models');
const ENG_LAB_CATEGORY = 'engineering_lab_objective';

// ── List folders (with bank counts) ──────────────────────────────────────────
exports.listFolders = async (req, res) => {
  try {
    const where = { is_archived: false };
    // super_admin and students both see all folders in this version

    const folders = await EngLabFolder.findAll({
      where,
      include: [{ model: User, as: 'creator', attributes: ['id', 'name'] }],
      order: [['order_index', 'ASC'], ['created_at', 'ASC']],
    });

    // attach bank count per folder
    const result = await Promise.all(folders.map(async (f) => {
      const banks = await QuestionBank.findAll({
        where: { folder_id: f.id, is_archived: false, category: ENG_LAB_CATEGORY },
        attributes: ['id'],
      });
      const bankIds = banks.map((b) => b.id);
      const qCount = bankIds.length
        ? await Question.count({ where: { bank_id: bankIds } })
        : 0;
      return { ...f.toJSON(), bank_count: banks.length, question_count: qCount };
    }));

    res.json({ folders: result });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ── Get folder with its banks ─────────────────────────────────────────────────
exports.getFolder = async (req, res) => {
  try {
    const folder = await EngLabFolder.findByPk(req.params.id);
    if (!folder) return res.status(404).json({ message: 'Folder not found' });

    const banks = await QuestionBank.findAll({
      where: { folder_id: folder.id, is_archived: false, category: ENG_LAB_CATEGORY },
      order: [['created_at', 'DESC']],
    });

    const banksWithCount = await Promise.all(banks.map(async (b) => {
      const count = await Question.count({ where: { bank_id: b.id } });
      return { ...b.toJSON(), question_count: count };
    }));

    res.json({ folder, banks: banksWithCount });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ── Create folder ─────────────────────────────────────────────────────────────
exports.createFolder = async (req, res) => {
  try {
    const { name, description, color, icon } = req.body;
    if (!name?.trim()) return res.status(400).json({ message: 'name is required' });
    const folder = await EngLabFolder.create({
      name, description, color: color || '#6366f1', icon: icon || '📁',
      org_id: req.user.org_id, created_by: req.user.id,
    });
    res.status(201).json({ folder });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ── Update folder ─────────────────────────────────────────────────────────────
exports.updateFolder = async (req, res) => {
  try {
    const folder = await EngLabFolder.findByPk(req.params.id);
    if (!folder) return res.status(404).json({ message: 'Folder not found' });
    const { name, description, color, icon, order_index } = req.body;
    await folder.update({ name, description, color, icon, order_index });
    res.json({ folder });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ── Delete folder ─────────────────────────────────────────────────────────────
exports.deleteFolder = async (req, res) => {
  try {
    const folder = await EngLabFolder.findByPk(req.params.id);
    if (!folder) return res.status(404).json({ message: 'Folder not found' });
    // unlink banks from folder before archiving
    await QuestionBank.update({ folder_id: null }, { where: { folder_id: folder.id } });
    await folder.update({ is_archived: true });
    res.json({ message: 'Folder deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ── Assign bank to folder ─────────────────────────────────────────────────────
exports.assignBank = async (req, res) => {
  try {
    const { bank_id } = req.body;
    const bank = await QuestionBank.findByPk(bank_id);
    if (!bank) return res.status(404).json({ message: 'Bank not found' });
    await bank.update({ folder_id: req.params.id });
    res.json({ message: 'Bank assigned to folder' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ── Remove bank from folder ───────────────────────────────────────────────────
exports.removeBank = async (req, res) => {
  try {
    const bank = await QuestionBank.findByPk(req.params.bankId);
    if (!bank) return res.status(404).json({ message: 'Bank not found' });
    await bank.update({ folder_id: null });
    res.json({ message: 'Bank removed from folder' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
