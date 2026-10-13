'use strict';
const { Op, fn, col } = require('sequelize');
const {
  Course, CourseModule, CourseTopic, CourseLesson,
  CourseEnrollment, LessonProgress, CourseTemplateVersion, CourseQuiz,
} = require('../models');

// ── GET /api/learn/courses  (student catalogue) ───────────────────────────────
exports.catalogue = async (req, res) => {
  try {
    const { search, category, difficulty, page = 1, limit = 20 } = req.query;
    const where = { status: 'published' };
    if (search) where.title = { [Op.like]: `%${search}%` };
    if (category) where.category = category;
    if (difficulty) where.difficulty = difficulty;

    const offset = (parseInt(page) - 1) * parseInt(limit);
    const { count, rows } = await Course.findAndCountAll({
      where,
      attributes: ['id','title','slug','summary','category','difficulty','cover_image_url',
                   'estimated_duration','tags','is_featured','published_at','created_at'],
      order: [['is_featured','DESC'],['published_at','DESC']],
      limit: parseInt(limit),
      offset,
    });

    const ids = rows.map(r => r.id);

    // Count ALL lessons (not just published) so admin-created content shows
    const lessonCounts = ids.length ? await CourseLesson.findAll({
      where: { course_id: ids },
      attributes: ['course_id', [fn('COUNT', col('id')), 'count']],
      group: ['course_id'],
      raw: true,
    }) : [];
    const lessonMap = Object.fromEntries(lessonCounts.map(l => [l.course_id, parseInt(l.count)]));

    let enrollMap = {};
    if (req.user) {
      const enrollments = ids.length ? await CourseEnrollment.findAll({
        where: { user_id: req.user.id, course_id: ids },
        attributes: ['course_id','progress','last_lesson_id'],
        raw: true,
      }) : [];
      enrollMap = Object.fromEntries(enrollments.map(e => [e.course_id, e]));
    }

    const courses = rows.map(c => ({
      ...c.toJSON(),
      lesson_count: lessonMap[c.id] || 0,
      enrollment: enrollMap[c.id] || null,
    }));
    res.json({ courses, total: count, page: parseInt(page), limit: parseInt(limit) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to fetch courses' });
  }
};

// ── GET /api/learn/courses/:slug  (course overview) ──────────────────────────
exports.getCourse = async (req, res) => {
  try {
    // Show ALL modules/topics/lessons regardless of status so admin content is visible
    const course = await Course.findOne({
      where: { slug: req.params.slug, status: 'published' },
      include: [{
        model: CourseModule, as: 'modules',
        required: false,
        include: [{
          model: CourseTopic, as: 'topics',
          required: false,
          include: [{
            model: CourseLesson, as: 'lessons',
            required: false,
            attributes: ['id','title','order_index','estimated_duration','is_free_preview','status'],
            order: [['order_index','ASC']],
          }],
          order: [['order_index','ASC']],
        }],
        order: [['order_index','ASC']],
      }],
    });
    if (!course) return res.status(404).json({ message: 'Course not found' });

    let enrollment = null;
    let lessonProgress = [];
    if (req.user) {
      enrollment = await CourseEnrollment.findOne({
        where: { user_id: req.user.id, course_id: course.id },
      });
      if (enrollment) {
        lessonProgress = await LessonProgress.findAll({
          where: { enrollment_id: enrollment.id, completed: true },
          attributes: ['lesson_id'],
          raw: true,
        });
      }
    }

    const completedIds = new Set(lessonProgress.map(l => l.lesson_id));
    res.json({ course, enrollment, completedLessonIds: [...completedIds] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to fetch course' });
  }
};

// ── POST /api/learn/courses/:slug/enroll ─────────────────────────────────────
exports.enroll = async (req, res) => {
  try {
    const course = await Course.findOne({ where: { slug: req.params.slug, status: 'published' } });
    if (!course) return res.status(404).json({ message: 'Course not found' });

    const [enrollment, created] = await CourseEnrollment.findOrCreate({
      where: { user_id: req.user.id, course_id: course.id },
      defaults: { last_accessed_at: new Date() },
    });
    res.status(created ? 201 : 200).json({ enrollment, created });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to enroll' });
  }
};

// ── GET /api/learn/courses/:slug/lesson/:lessonId ─────────────────────────────
exports.getLesson = async (req, res) => {
  try {
    const course = await Course.findOne({ where: { slug: req.params.slug, status: 'published' } });
    if (!course) return res.status(404).json({ message: 'Course not found' });

    const enrollment = await CourseEnrollment.findOne({
      where: { user_id: req.user.id, course_id: course.id },
    });
    if (!enrollment) return res.status(403).json({ message: 'Not enrolled in this course' });

    // Fetch lesson regardless of status — admin may not have published it yet
    const lesson = await CourseLesson.findOne({
      where: { id: req.params.lessonId, course_id: course.id },
    });
    if (!lesson) return res.status(404).json({ message: 'Lesson not found' });

    await enrollment.update({ last_lesson_id: lesson.id, last_accessed_at: new Date() });

    const progress = await LessonProgress.findOne({
      where: { enrollment_id: enrollment.id, lesson_id: lesson.id },
    });

    // Prev/next from ALL lessons (not just published)
    const allLessons = await CourseLesson.findAll({
      where: { course_id: course.id },
      attributes: ['id','title','order_index','module_id','topic_id'],
      order: [['module_id','ASC'],['order_index','ASC']],
    });
    const idx = allLessons.findIndex(l => l.id === lesson.id);
    const prevLesson = idx > 0 ? allLessons[idx - 1] : null;
    const nextLesson = idx < allLessons.length - 1 ? allLessons[idx + 1] : null;

    // Template config
    let templateConfig = null;
    if (course.template_id) {
      const version = course.template_version
        ? await CourseTemplateVersion.findOne({ where: { template_id: course.template_id, version: course.template_version } })
        : await CourseTemplateVersion.findOne({ where: { template_id: course.template_id }, order: [['version','DESC']] });
      if (version) templateConfig = version.config;
    }

    // Quiz for this lesson (any status)
    const quiz = await CourseQuiz.findOne({
      where: { lesson_id: lesson.id },
      attributes: ['id','title','time_limit','max_attempts','passing_percentage','status'],
    });

    res.json({ lesson, enrollment, progress, prevLesson, nextLesson, templateConfig, quiz });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to fetch lesson' });
  }
};

// ── POST /api/learn/courses/:slug/lesson/:lessonId/complete ──────────────────
exports.completeLesson = async (req, res) => {
  try {
    const course = await Course.findOne({ where: { slug: req.params.slug, status: 'published' } });
    if (!course) return res.status(404).json({ message: 'Course not found' });

    const enrollment = await CourseEnrollment.findOne({
      where: { user_id: req.user.id, course_id: course.id },
    });
    if (!enrollment) return res.status(403).json({ message: 'Not enrolled' });

    const lesson = await CourseLesson.findOne({
      where: { id: req.params.lessonId, course_id: course.id },
    });
    if (!lesson) return res.status(404).json({ message: 'Lesson not found' });

    const [lp, created] = await LessonProgress.findOrCreate({
      where: { enrollment_id: enrollment.id, lesson_id: lesson.id },
      defaults: { user_id: req.user.id, completed: true, completed_at: new Date() },
    });
    if (!created && !lp.completed) {
      await lp.update({ completed: true, completed_at: new Date() });
    }

    // Recalculate progress from ALL lessons
    const totalLessons = await CourseLesson.count({ where: { course_id: course.id } });
    const completedCount = await LessonProgress.count({ where: { enrollment_id: enrollment.id, completed: true } });
    const progress = totalLessons > 0 ? Math.round((completedCount / totalLessons) * 100) : 0;
    const completed_at = progress === 100 ? (enrollment.completed_at || new Date()) : null;
    await enrollment.update({ progress, last_lesson_id: lesson.id, last_accessed_at: new Date(), completed_at });

    res.json({ progress, completedCount, totalLessons });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to mark lesson complete' });
  }
};

// ── GET /api/learn/my-learning ────────────────────────────────────────────────
exports.myLearning = async (req, res) => {
  try {
    const enrollments = await CourseEnrollment.findAll({
      where: { user_id: req.user.id },
      include: [{
        model: Course, as: 'course',
        where: { status: 'published' },
        attributes: ['id','title','slug','summary','cover_image_url','category','difficulty'],
      }],
      order: [['last_accessed_at','DESC']],
    });
    res.json({ enrollments });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to fetch my learning' });
  }
};
