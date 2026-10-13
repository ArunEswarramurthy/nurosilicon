'use strict';

const { LabGroup, LabProblem } = require('../models');

const slugify = (value) => String(value || '').trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

exports.list = async (req, res) => {
  try {
    const groups = await LabGroup.findAll({
      where: { is_active: true },
      include: [{ model: LabProblem, as: 'assigned_problems', attributes: ['id'], where: { is_active: true }, required: false }],
      order: [['name', 'ASC']],
    });
    res.json({ groups: groups.map((group) => ({ ...group.toJSON(), problem_count: group.assigned_problems?.length || 0, problem_ids: (group.assigned_problems || []).map((problem) => problem.id) })) });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

exports.get = async (req, res) => {
  try {
    const group = await LabGroup.findOne({
      where: { id: req.params.id, is_active: true },
      include: [{ model: LabProblem, as: 'assigned_problems', where: { is_active: true }, required: false, attributes: ['id'] }],
    });
    if (!group) return res.status(404).json({ message: 'Lab group not found' });
    res.json({ group: { ...group.toJSON(), problem_count: group.assigned_problems?.length || 0, problem_ids: (group.assigned_problems || []).map((problem) => problem.id) } });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

exports.create = async (req, res) => {
  try {
    const { name, description, icon, color } = req.body;
    if (!name?.trim()) return res.status(400).json({ message: 'Group name is required' });
    const base = slugify(name);
    const slug = `${base || 'lab-group'}-${Date.now().toString(36)}`;
    const group = await LabGroup.create({ name: name.trim(), slug, description, icon: icon || '📚', color: color || '#6366f1', created_by: req.user.id });
    res.status(201).json({ group });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

exports.update = async (req, res) => {
  try {
    const group = await LabGroup.findByPk(req.params.id);
    if (!group) return res.status(404).json({ message: 'Lab group not found' });
    await group.update({ name: req.body.name, description: req.body.description, icon: req.body.icon, color: req.body.color });
    res.json({ group });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

exports.remove = async (req, res) => {
  try {
    const group = await LabGroup.findByPk(req.params.id);
    if (!group) return res.status(404).json({ message: 'Lab group not found' });
    await group.update({ is_active: false });
    await LabProblem.update({ group_id: null }, { where: { group_id: group.id } });
    res.json({ message: 'Lab group deactivated' });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

// POST /lab/groups/:id/assign  { problem_ids: [...], remove_ids: [...] }
// POST /lab/groups/:id/assign  { problem_ids: [...], remove_ids: [...] }
exports.assignProblems = async (req, res) => {
  try {
    const group = await LabGroup.findByPk(req.params.id);
    if (!group) return res.status(404).json({ message: 'Lab group not found' });

    const { problem_ids = [], remove_ids = [] } = req.body;
    const { LabProblemGroup } = require('../models');

    // Add problems to group via junction table (ignore duplicates)
    if (problem_ids.length > 0) {
      const rows = problem_ids.map(pid => ({ problem_id: pid, group_id: group.id }));
      await LabProblemGroup.bulkCreate(rows, { ignoreDuplicates: true });
    }

    // Remove problems from group via junction table
    if (remove_ids.length > 0) {
      await LabProblemGroup.destroy({ where: { group_id: group.id, problem_id: remove_ids } });
    }

    // Return updated group with problem count
    const updated = await LabGroup.findOne({
      where: { id: group.id },
      include: [{ model: LabProblem, as: 'assigned_problems', attributes: ['id'], where: { is_active: true }, required: false }],
    });

    res.json({
      message: 'Assigned ' + problem_ids.length + ' problems, removed ' + remove_ids.length,
      group: {
        ...updated.toJSON(),
        problem_count: updated.assigned_problems?.length || 0,
        problem_ids: (updated.assigned_problems || []).map(p => p.id),
      },
    });
  } catch (err) { res.status(500).json({ message: err.message }); }
};
