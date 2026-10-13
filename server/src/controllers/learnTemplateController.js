'use strict';
const { CourseTemplate, CourseTemplateVersion, Course, User } = require('../models');
const { Op } = require('sequelize');

// ── Default template configs ──────────────────────────────────────────────────
const PRESETS = {
  documentation: {
    layout: { type: 'documentation', sidebar: 'left', sidebarWidth: 280, contentWidth: 860, spacing: 'balanced' },
    colors: { pageBg: '#f8fafc', contentBg: '#ffffff', headerBg: '#0a0a1a', sidebarBg: '#f1f4f9', primary: '#00A6FF', secondary: '#A020F0', accent: '#00E5FF', headingColor: '#0a0a1a', bodyColor: '#374151', linkColor: '#00A6FF', buttonBg: '#00A6FF', buttonText: '#ffffff', borderColor: '#e2e8f0', progressColor: '#00A6FF' },
    typography: { fontFamily: 'Inter', headingSize: 24, bodySize: 14, studentNameSize: 14, fontWeight: 400, lineHeight: 1.6, letterSpacing: 0, textAlign: 'left', headingColor: '#0a0a1a', bodyColor: '#374151' },
    components: { courseHeader: true, courseTitle: true, courseDescription: true, studentIdentity: true, courseProgress: true, curriculumSidebar: true, lessonTitle: true, richContent: true, images: true, videoEmbeds: true, codeBlocks: true, resources: true, quizEntry: true, prevNextButtons: true, markCompleted: true, notes: true },
    studentIdentity: { showName: true, showAvatar: true, showProgress: true, alignment: 'right', fontSize: 13, fontWeight: 600, color: '#0a0a1a' },
    dimensions: { headerHeight: 56, footerVisible: true, contentPadding: 32, cardRadius: 12, borderThickness: 1.5 },
  },
  split_screen: {
    layout: { type: 'split_screen', sidebar: 'left', sidebarWidth: 320, contentWidth: 'auto', spacing: 'compact' },
    colors: { pageBg: '#0a0a1a', contentBg: '#111827', headerBg: '#07070f', sidebarBg: '#0d0d1a', primary: '#00A6FF', secondary: '#A020F0', accent: '#00E5FF', headingColor: '#f1f5f9', bodyColor: '#cbd5e1', linkColor: '#00A6FF', buttonBg: '#00A6FF', buttonText: '#ffffff', borderColor: '#1e293b', progressColor: '#00A6FF' },
    typography: { fontFamily: 'Inter', headingSize: 22, bodySize: 14, studentNameSize: 13, fontWeight: 400, lineHeight: 1.55, letterSpacing: 0, textAlign: 'left', headingColor: '#f1f5f9', bodyColor: '#cbd5e1' },
    components: { courseHeader: true, courseTitle: true, courseDescription: false, studentIdentity: true, courseProgress: true, curriculumSidebar: true, lessonTitle: true, richContent: true, images: true, videoEmbeds: true, codeBlocks: true, resources: true, quizEntry: true, prevNextButtons: true, markCompleted: true, notes: true },
    studentIdentity: { showName: true, showAvatar: true, showProgress: false, alignment: 'left', fontSize: 13, fontWeight: 500, color: '#94a3b8' },
    dimensions: { headerHeight: 52, footerVisible: false, contentPadding: 24, cardRadius: 8, borderThickness: 1 },
  },
  video_course: {
    layout: { type: 'video_course', sidebar: 'right', sidebarWidth: 300, contentWidth: 'auto', spacing: 'spacious' },
    colors: { pageBg: '#ffffff', contentBg: '#ffffff', headerBg: '#0a0a1a', sidebarBg: '#f8fafc', primary: '#00A6FF', secondary: '#A020F0', accent: '#00E5FF', headingColor: '#0a0a1a', bodyColor: '#374151', linkColor: '#00A6FF', buttonBg: '#00A6FF', buttonText: '#ffffff', borderColor: '#e2e8f0', progressColor: '#10B981' },
    typography: { fontFamily: 'Inter', headingSize: 20, bodySize: 14, studentNameSize: 13, fontWeight: 400, lineHeight: 1.6, letterSpacing: 0, textAlign: 'left', headingColor: '#0a0a1a', bodyColor: '#374151' },
    components: { courseHeader: true, courseTitle: true, courseDescription: true, studentIdentity: true, courseProgress: true, curriculumSidebar: true, lessonTitle: true, richContent: true, images: true, videoEmbeds: true, codeBlocks: false, resources: true, quizEntry: true, prevNextButtons: true, markCompleted: true, notes: false },
    studentIdentity: { showName: true, showAvatar: true, showProgress: true, alignment: 'right', fontSize: 13, fontWeight: 600, color: '#0a0a1a' },
    dimensions: { headerHeight: 60, footerVisible: true, contentPadding: 28, cardRadius: 12, borderThickness: 1.5 },
  },
};

const ALLOWED_COMPONENT_KEYS = new Set([
  'courseHeader','courseTitle','courseDescription','studentIdentity','courseProgress',
  'curriculumSidebar','moduleHeadings','lessonNavigation','lessonTitle','richContent',
  'images','videoEmbeds','codeBlocks','engineeringDiagrams','resources','quizEntry',
  'prevNextButtons','markCompleted','notes',
]);

function validateConfig(cfg) {
  if (!cfg || typeof cfg !== 'object') return false;
  // Validate component keys
  if (cfg.components) {
    for (const k of Object.keys(cfg.components)) {
      if (!ALLOWED_COMPONENT_KEYS.has(k)) return false;
      if (typeof cfg.components[k] !== 'boolean') return false;
    }
  }
  // Validate bounded numeric dimensions
  if (cfg.dimensions) {
    const d = cfg.dimensions;
    if (d.headerHeight !== undefined && (d.headerHeight < 40 || d.headerHeight > 120)) return false;
    if (d.contentPadding !== undefined && (d.contentPadding < 8 || d.contentPadding > 80)) return false;
    if (d.cardRadius !== undefined && (d.cardRadius < 0 || d.cardRadius > 32)) return false;
    if (d.borderThickness !== undefined && (d.borderThickness < 0 || d.borderThickness > 4)) return false;
  }
  if (cfg.layout?.sidebarWidth !== undefined) {
    const sw = cfg.layout.sidebarWidth;
    if (sw < 180 || sw > 480) return false;
  }
  // Validate typography bounds
  if (cfg.typography) {
    const t = cfg.typography;
    if (t.headingSize !== undefined && (t.headingSize < 14 || t.headingSize > 48)) return false;
    if (t.bodySize !== undefined && (t.bodySize < 11 || t.bodySize > 22)) return false;
    if (t.lineHeight !== undefined && (t.lineHeight < 1.2 || t.lineHeight > 2.2)) return false;
    if (t.letterSpacing !== undefined && (t.letterSpacing < -0.05 || t.letterSpacing > 0.1)) return false;
    const ALLOWED_FONTS = ['Inter','Roboto','Open Sans','Lato','Poppins','Source Sans Pro','Nunito'];
    if (t.fontFamily && !ALLOWED_FONTS.includes(t.fontFamily)) return false;
  }
  return true;
}

// GET /api/admin/learn/templates
exports.list = async (req, res) => {
  try {
    const templates = await CourseTemplate.findAll({
      where: { status: { [Op.ne]: 'archived' } },
      include: [{ model: User, as: 'creator', attributes: ['id','name'] }],
      order: [['created_at','DESC']],
    });
    res.json({ templates });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to fetch templates' });
  }
};

// POST /api/admin/learn/templates
exports.create = async (req, res) => {
  try {
    const { name, description, preset = 'custom' } = req.body;
    if (!name?.trim()) return res.status(400).json({ message: 'Name is required' });
    const baseConfig = PRESETS[preset] || PRESETS.documentation;
    const t = await CourseTemplate.create({
      name: name.trim(),
      description: description?.trim() || '',
      preset,
      config: baseConfig,
      created_by: req.user.id,
    });
    res.status(201).json({ template: t });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to create template' });
  }
};

// GET /api/admin/learn/templates/:id
exports.get = async (req, res) => {
  try {
    const t = await CourseTemplate.findByPk(req.params.id, {
      include: [
        { model: User, as: 'creator', attributes: ['id','name'] },
        { model: CourseTemplateVersion, as: 'versions', order: [['version','DESC']], limit: 10 },
      ],
    });
    if (!t) return res.status(404).json({ message: 'Template not found' });
    res.json({ template: t });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to fetch template' });
  }
};

// PUT /api/admin/learn/templates/:id  (save draft config)
exports.update = async (req, res) => {
  try {
    const t = await CourseTemplate.findByPk(req.params.id);
    if (!t) return res.status(404).json({ message: 'Template not found' });
    if (t.status === 'archived') return res.status(400).json({ message: 'Cannot edit archived template' });

    const { name, description, config } = req.body;
    if (config !== undefined && !validateConfig(config))
      return res.status(400).json({ message: 'Invalid template configuration' });

    await t.update({
      ...(name !== undefined && { name: name.trim() }),
      ...(description !== undefined && { description: description.trim() }),
      ...(config !== undefined && { config }),
    });
    res.json({ template: t });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to update template' });
  }
};

// POST /api/admin/learn/templates/:id/publish
exports.publish = async (req, res) => {
  try {
    const t = await CourseTemplate.findByPk(req.params.id);
    if (!t) return res.status(404).json({ message: 'Template not found' });
    if (!validateConfig(t.config)) return res.status(400).json({ message: 'Template config is invalid; fix before publishing' });

    const lastVersion = await CourseTemplateVersion.findOne({
      where: { template_id: t.id },
      order: [['version','DESC']],
    });
    const nextVersion = (lastVersion?.version || 0) + 1;

    const version = await CourseTemplateVersion.create({
      template_id: t.id,
      version: nextVersion,
      config: t.config,
      published_by: req.user.id,
      published_at: new Date(),
    });
    await t.update({ status: 'published' });
    res.json({ template: t, version });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to publish template' });
  }
};

// POST /api/admin/learn/templates/:id/rollback/:versionId
exports.rollback = async (req, res) => {
  try {
    const t = await CourseTemplate.findByPk(req.params.id);
    if (!t) return res.status(404).json({ message: 'Template not found' });
    const v = await CourseTemplateVersion.findOne({
      where: { id: req.params.versionId, template_id: t.id },
    });
    if (!v) return res.status(404).json({ message: 'Version not found' });
    await t.update({ config: v.config });
    res.json({ template: t, rolledBackTo: v.version });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to rollback template' });
  }
};

// POST /api/admin/learn/templates/:id/duplicate
exports.duplicate = async (req, res) => {
  try {
    const t = await CourseTemplate.findByPk(req.params.id);
    if (!t) return res.status(404).json({ message: 'Template not found' });
    const copy = await CourseTemplate.create({
      name: `${t.name} (Copy)`,
      description: t.description,
      preset: t.preset,
      config: t.config,
      status: 'draft',
      created_by: req.user.id,
    });
    res.status(201).json({ template: copy });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to duplicate template' });
  }
};

// DELETE /api/admin/learn/templates/:id  (archive)
exports.archive = async (req, res) => {
  try {
    const t = await CourseTemplate.findByPk(req.params.id);
    if (!t) return res.status(404).json({ message: 'Template not found' });
    await t.update({ status: 'archived' });
    res.json({ message: 'Template archived' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to archive template' });
  }
};

// GET /api/admin/learn/templates/:id/versions
exports.versions = async (req, res) => {
  try {
    const versions = await CourseTemplateVersion.findAll({
      where: { template_id: req.params.id },
      include: [{ model: User, as: 'publisher', attributes: ['id','name'] }],
      order: [['version','DESC']],
    });
    res.json({ versions });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to fetch versions' });
  }
};

// GET /api/learn/templates/:id/effective  (student-facing — returns published config)
exports.getEffective = async (req, res) => {
  try {
    const v = await CourseTemplateVersion.findOne({
      where: { template_id: req.params.id },
      order: [['version','DESC']],
    });
    if (!v) return res.status(404).json({ message: 'No published version found' });
    res.json({ config: v.config, version: v.version });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to fetch template config' });
  }
};

exports.PRESETS = PRESETS;
