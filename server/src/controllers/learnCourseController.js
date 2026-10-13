'use strict';
const { Op, fn, col, literal } = require('sequelize');
const {
  Course, CourseModule, CourseTopic, CourseLesson,
  CourseTemplate, CourseTemplateVersion, CourseEnrollment,
  LessonProgress, CourseQuiz, User, sequelize,
} = require('../models');
const multer = require('multer');
const path   = require('path');
const fs     = require('fs');

// ── Upload middleware ─────────────────────────────────────────────────────────
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(__dirname, '../../uploads/course-thumbnails');
    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `course-${Date.now()}${ext}`);
  },
});
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = ['.jpg','.jpeg','.png','.webp'];
    if (allowed.includes(path.extname(file.originalname).toLowerCase())) cb(null, true);
    else cb(new Error('Only jpg/png/webp images allowed'));
  },
});
exports.uploadMiddleware = upload.single('cover_image');

// ── Slug helper ───────────────────────────────────────────────────────────────
function slugify(text) {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

async function uniqueSlug(base, excludeId = null) {
  let slug = slugify(base);
  let n = 0;
  while (true) {
    const candidate = n === 0 ? slug : `${slug}-${n}`;
    const where = { slug: candidate };
    if (excludeId) where.id = { [Op.ne]: excludeId };
    const existing = await Course.findOne({ where });
    if (!existing) return candidate;
    n++;
  }
}

// ── Admin: list courses ───────────────────────────────────────────────────────
exports.list = async (req, res) => {
  try {
    const { status, search, page = 1, limit = 20 } = req.query;
    const where = {};
    if (status) where.status = status;
    if (search) where.title = { [Op.like]: `%${search}%` };

    const offset = (parseInt(page) - 1) * parseInt(limit);
    const { count, rows } = await Course.findAndCountAll({
      where,
      include: [
        { model: User, as: 'creator', attributes: ['id','name'] },
        { model: CourseTemplate, as: 'template', attributes: ['id','name'] },
      ],
      order: [['updated_at','DESC']],
      limit: parseInt(limit),
      offset,
    });

    // Attach enrollment counts
    const ids = rows.map(r => r.id);
    const enrollCounts = ids.length ? await CourseEnrollment.findAll({
      where: { course_id: ids },
      attributes: ['course_id', [fn('COUNT', col('id')), 'count']],
      group: ['course_id'],
      raw: true,
    }) : [];
    const enrollMap = Object.fromEntries(enrollCounts.map(e => [e.course_id, parseInt(e.count)]));

    const courses = rows.map(c => ({ ...c.toJSON(), enrollment_count: enrollMap[c.id] || 0 }));
    res.json({ courses, total: count, page: parseInt(page), limit: parseInt(limit) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to fetch courses' });
  }
};

// ── Admin: create course ──────────────────────────────────────────────────────
exports.create = async (req, res) => {
  try {
    const {
      title, summary, description, category, difficulty,
      learning_objectives, prerequisites, estimated_duration, tags,
      template_id, template_version,
    } = req.body;
    if (!title?.trim()) return res.status(400).json({ message: 'Title is required' });

    const slug = await uniqueSlug(title);
    const cover_image_url = req.file ? `/uploads/course-thumbnails/${req.file.filename}` : null;

    const course = await Course.create({
      title: title.trim(),
      slug,
      summary: summary?.trim() || '',
      description: description?.trim() || '',
      category: category?.trim() || '',
      difficulty: difficulty || 'beginner',
      cover_image_url,
      learning_objectives: Array.isArray(learning_objectives) ? learning_objectives : [],
      prerequisites: Array.isArray(prerequisites) ? prerequisites : [],
      estimated_duration: parseInt(estimated_duration) || 0,
      tags: Array.isArray(tags) ? tags : [],
      template_id: template_id || null,
      template_version: template_version ? parseInt(template_version) : null,
      created_by: req.user.id,
    });
    res.status(201).json({ course });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to create course' });
  }
};

// ── Admin: get course detail ──────────────────────────────────────────────────
exports.get = async (req, res) => {
  try {
    const course = await Course.findByPk(req.params.id, {
      include: [
        { model: User, as: 'creator', attributes: ['id','name'] },
        { model: CourseTemplate, as: 'template', attributes: ['id','name','status'] },
        {
          model: CourseModule, as: 'modules',
          include: [{
            model: CourseTopic, as: 'topics',
            include: [{ model: CourseLesson, as: 'lessons', order: [['order_index','ASC']] }],
            order: [['order_index','ASC']],
          }],
          order: [['order_index','ASC']],
        },
        { model: CourseQuiz, as: 'quizzes', attributes: ['id','title','status','lesson_id','module_id'] },
      ],
    });
    if (!course) return res.status(404).json({ message: 'Course not found' });
    res.json({ course });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to fetch course' });
  }
};

// ── Admin: update course ──────────────────────────────────────────────────────
exports.update = async (req, res) => {
  try {
    const course = await Course.findByPk(req.params.id);
    if (!course) return res.status(404).json({ message: 'Course not found' });

    const {
      title, summary, description, category, difficulty,
      learning_objectives, prerequisites, estimated_duration, tags,
      template_id, template_version, is_featured,
    } = req.body;

    const cover_image_url = req.file
      ? `/uploads/course-thumbnails/${req.file.filename}`
      : course.cover_image_url;

    const slug = title && title.trim() !== course.title
      ? await uniqueSlug(title, course.id)
      : course.slug;

    await course.update({
      ...(title !== undefined && { title: title.trim(), slug }),
      ...(summary !== undefined && { summary: summary.trim() }),
      ...(description !== undefined && { description: description.trim() }),
      ...(category !== undefined && { category: category.trim() }),
      ...(difficulty !== undefined && { difficulty }),
      cover_image_url,
      ...(learning_objectives !== undefined && { learning_objectives }),
      ...(prerequisites !== undefined && { prerequisites }),
      ...(estimated_duration !== undefined && { estimated_duration: parseInt(estimated_duration) || 0 }),
      ...(tags !== undefined && { tags }),
      ...(template_id !== undefined && { template_id: template_id || null }),
      ...(template_version !== undefined && { template_version: template_version ? parseInt(template_version) : null }),
      ...(is_featured !== undefined && { is_featured: Boolean(is_featured) }),
    });
    res.json({ course });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to update course' });
  }
};

// ── Admin: publish / unpublish ────────────────────────────────────────────────
exports.publish = async (req, res) => {
  try {
    const course = await Course.findByPk(req.params.id);
    if (!course) return res.status(404).json({ message: 'Course not found' });
    if (course.status === 'archived') return res.status(400).json({ message: 'Cannot publish archived course' });
    await course.update({ status: 'published', published_at: new Date() });
    res.json({ course });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to publish course' });
  }
};

exports.unpublish = async (req, res) => {
  try {
    const course = await Course.findByPk(req.params.id);
    if (!course) return res.status(404).json({ message: 'Course not found' });
    await course.update({ status: 'draft' });
    res.json({ course });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to unpublish course' });
  }
};

exports.archive = async (req, res) => {
  try {
    const course = await Course.findByPk(req.params.id);
    if (!course) return res.status(404).json({ message: 'Course not found' });
    await course.update({ status: 'archived' });
    res.json({ course });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to archive course' });
  }
};

// ── Admin: duplicate course ───────────────────────────────────────────────────
exports.duplicate = async (req, res) => {
  try {
    const src = await Course.findByPk(req.params.id, {
      include: [{
        model: CourseModule, as: 'modules',
        include: [{ model: CourseTopic, as: 'topics', include: [{ model: CourseLesson, as: 'lessons' }] }],
      }],
    });
    if (!src) return res.status(404).json({ message: 'Course not found' });

    const slug = await uniqueSlug(`${src.title} copy`);
    const copy = await Course.create({
      title: `${src.title} (Copy)`,
      slug,
      summary: src.summary,
      description: src.description,
      category: src.category,
      difficulty: src.difficulty,
      cover_image_url: src.cover_image_url,
      learning_objectives: src.learning_objectives,
      prerequisites: src.prerequisites,
      estimated_duration: src.estimated_duration,
      tags: src.tags,
      template_id: src.template_id,
      template_version: src.template_version,
      status: 'draft',
      created_by: req.user.id,
    });

    // Duplicate curriculum
    for (const mod of (src.modules || [])) {
      const newMod = await CourseModule.create({
        course_id: copy.id, title: mod.title, description: mod.description,
        order_index: mod.order_index, status: 'draft',
      });
      for (const topic of (mod.topics || [])) {
        const newTopic = await CourseTopic.create({
          module_id: newMod.id, course_id: copy.id, title: topic.title,
          description: topic.description, order_index: topic.order_index, status: 'draft',
        });
        for (const lesson of (topic.lessons || [])) {
          await CourseLesson.create({
            topic_id: newTopic.id, module_id: newMod.id, course_id: copy.id,
            title: lesson.title, content_blocks: lesson.content_blocks,
            order_index: lesson.order_index, estimated_duration: lesson.estimated_duration,
            status: 'draft',
          });
        }
      }
    }
    res.status(201).json({ course: copy });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to duplicate course' });
  }
};

// ── Admin: analytics ─────────────────────────────────────────────────────────
exports.analytics = async (req, res) => {
  try {
    const course = await Course.findByPk(req.params.id);
    if (!course) return res.status(404).json({ message: 'Course not found' });

    const totalEnrollments = await CourseEnrollment.count({ where: { course_id: course.id } });
    const completedEnrollments = await CourseEnrollment.count({ where: { course_id: course.id, completed_at: { [Op.ne]: null } } });
    const totalLessons = await CourseLesson.count({ where: { course_id: course.id, status: 'published' } });
    const totalCompletions = await LessonProgress.count({
      where: { completed: true },
      include: [{ model: CourseEnrollment, as: 'enrollment', where: { course_id: course.id }, attributes: [] }],
    });

    const recentEnrollments = await CourseEnrollment.findAll({
      where: { course_id: course.id },
      include: [{ model: User, as: 'student', attributes: ['id','name','email'] }],
      order: [['created_at','DESC']],
      limit: 10,
    });

    res.json({
      course: { id: course.id, title: course.title, status: course.status },
      totalEnrollments,
      completedEnrollments,
      completionRate: totalEnrollments > 0 ? Math.round((completedEnrollments / totalEnrollments) * 100) : 0,
      totalLessons,
      totalLessonCompletions: totalCompletions,
      recentEnrollments,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to fetch analytics' });
  }
};

// ── Admin: dashboard stats ────────────────────────────────────────────────────
exports.dashboardStats = async (req, res) => {
  try {
    const [total, published, draft, archived, enrollments] = await Promise.all([
      Course.count(),
      Course.count({ where: { status: 'published' } }),
      Course.count({ where: { status: 'draft' } }),
      Course.count({ where: { status: 'archived' } }),
      CourseEnrollment.count(),
    ]);
    const recent = await Course.findAll({
      order: [['updated_at','DESC']],
      limit: 5,
      attributes: ['id','title','slug','status','updated_at'],
    });
    res.json({ total, published, draft, archived, enrollments, recent });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to fetch stats' });
  }
};
