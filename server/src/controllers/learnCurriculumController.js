'use strict';
const {
  CourseModule, CourseTopic, CourseLesson, Course,
} = require('../models');

// ── Modules ───────────────────────────────────────────────────────────────────
exports.listModules = async (req, res) => {
  try {
    const course = await Course.findByPk(req.params.courseId);
    if (!course) return res.status(404).json({ message: 'Course not found' });
    const modules = await CourseModule.findAll({
      where: { course_id: req.params.courseId },
      include: [{
        model: CourseTopic, as: 'topics',
        include: [{ model: CourseLesson, as: 'lessons', order: [['order_index','ASC']] }],
        order: [['order_index','ASC']],
      }],
      order: [['order_index','ASC']],
    });
    res.json({ modules });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to fetch modules' });
  }
};

exports.createModule = async (req, res) => {
  try {
    const { title, description } = req.body;
    if (!title?.trim()) return res.status(400).json({ message: 'Title required' });
    const count = await CourseModule.count({ where: { course_id: req.params.courseId } });
    const mod = await CourseModule.create({
      course_id: req.params.courseId,
      title: title.trim(),
      description: description?.trim() || '',
      order_index: count,
    });
    res.status(201).json({ module: mod });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to create module' });
  }
};

exports.updateModule = async (req, res) => {
  try {
    const mod = await CourseModule.findOne({ where: { id: req.params.moduleId, course_id: req.params.courseId } });
    if (!mod) return res.status(404).json({ message: 'Module not found' });
    const { title, description, status } = req.body;
    await mod.update({
      ...(title !== undefined && { title: title.trim() }),
      ...(description !== undefined && { description: description.trim() }),
      ...(status !== undefined && { status }),
    });
    res.json({ module: mod });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to update module' });
  }
};

exports.deleteModule = async (req, res) => {
  try {
    const mod = await CourseModule.findOne({ where: { id: req.params.moduleId, course_id: req.params.courseId } });
    if (!mod) return res.status(404).json({ message: 'Module not found' });
    await mod.destroy();
    res.json({ message: 'Module deleted' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to delete module' });
  }
};

// ── Topics ────────────────────────────────────────────────────────────────────
exports.createTopic = async (req, res) => {
  try {
    const mod = await CourseModule.findOne({ where: { id: req.params.moduleId, course_id: req.params.courseId } });
    if (!mod) return res.status(404).json({ message: 'Module not found' });
    const { title, description } = req.body;
    if (!title?.trim()) return res.status(400).json({ message: 'Title required' });
    const count = await CourseTopic.count({ where: { module_id: mod.id } });
    const topic = await CourseTopic.create({
      module_id: mod.id,
      course_id: req.params.courseId,
      title: title.trim(),
      description: description?.trim() || '',
      order_index: count,
    });
    res.status(201).json({ topic });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to create topic' });
  }
};

exports.updateTopic = async (req, res) => {
  try {
    const topic = await CourseTopic.findOne({ where: { id: req.params.topicId, course_id: req.params.courseId } });
    if (!topic) return res.status(404).json({ message: 'Topic not found' });
    const { title, description, status } = req.body;
    await topic.update({
      ...(title !== undefined && { title: title.trim() }),
      ...(description !== undefined && { description: description.trim() }),
      ...(status !== undefined && { status }),
    });
    res.json({ topic });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to update topic' });
  }
};

exports.deleteTopic = async (req, res) => {
  try {
    const topic = await CourseTopic.findOne({ where: { id: req.params.topicId, course_id: req.params.courseId } });
    if (!topic) return res.status(404).json({ message: 'Topic not found' });
    await topic.destroy();
    res.json({ message: 'Topic deleted' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to delete topic' });
  }
};

// ── Lessons ───────────────────────────────────────────────────────────────────
exports.createLesson = async (req, res) => {
  try {
    const topic = await CourseTopic.findOne({ where: { id: req.params.topicId, course_id: req.params.courseId } });
    if (!topic) return res.status(404).json({ message: 'Topic not found' });
    const { title, content_blocks, estimated_duration } = req.body;
    if (!title?.trim()) return res.status(400).json({ message: 'Title required' });
    const count = await CourseLesson.count({ where: { topic_id: topic.id } });
    const lesson = await CourseLesson.create({
      topic_id: topic.id,
      module_id: topic.module_id,
      course_id: req.params.courseId,
      title: title.trim(),
      content_blocks: Array.isArray(content_blocks) ? content_blocks : [],
      order_index: count,
      estimated_duration: parseInt(estimated_duration) || 0,
    });
    res.status(201).json({ lesson });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to create lesson' });
  }
};

exports.getLesson = async (req, res) => {
  try {
    const lesson = await CourseLesson.findOne({
      where: { id: req.params.lessonId, course_id: req.params.courseId },
    });
    if (!lesson) return res.status(404).json({ message: 'Lesson not found' });
    res.json({ lesson });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to fetch lesson' });
  }
};

exports.updateLesson = async (req, res) => {
  try {
    const lesson = await CourseLesson.findOne({
      where: { id: req.params.lessonId, course_id: req.params.courseId },
    });
    if (!lesson) return res.status(404).json({ message: 'Lesson not found' });
    const { title, content_blocks, estimated_duration, status, is_free_preview } = req.body;

    // Validate content_blocks — only allow known block types
    const ALLOWED_BLOCK_TYPES = new Set([
      'heading','paragraph','image','video','code','callout','list',
      'table','resource','quiz_link','divider','math','link',
    ]);
    if (content_blocks !== undefined) {
      if (!Array.isArray(content_blocks)) return res.status(400).json({ message: 'content_blocks must be array' });
      for (const block of content_blocks) {
        if (!ALLOWED_BLOCK_TYPES.has(block.type)) return res.status(400).json({ message: `Unknown block type: ${block.type}` });
      }
    }

    await lesson.update({
      ...(title !== undefined && { title: title.trim() }),
      ...(content_blocks !== undefined && { content_blocks }),
      ...(estimated_duration !== undefined && { estimated_duration: parseInt(estimated_duration) || 0 }),
      ...(status !== undefined && { status }),
      ...(is_free_preview !== undefined && { is_free_preview: Boolean(is_free_preview) }),
    });
    res.json({ lesson });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to update lesson' });
  }
};

exports.deleteLesson = async (req, res) => {
  try {
    const lesson = await CourseLesson.findOne({
      where: { id: req.params.lessonId, course_id: req.params.courseId },
    });
    if (!lesson) return res.status(404).json({ message: 'Lesson not found' });
    await lesson.destroy();
    res.json({ message: 'Lesson deleted' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to delete lesson' });
  }
};

// ── Publish all modules/topics/lessons for a course ────────────────────────
exports.publishAll = async (req, res) => {
  try {
    const courseId = req.params.courseId;
    await CourseModule.update({ status: 'published' }, { where: { course_id: courseId } });
    await CourseTopic.update({ status: 'published' }, { where: { course_id: courseId } });
    await CourseLesson.update({ status: 'published' }, { where: { course_id: courseId } });
    res.json({ message: 'All content published' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to publish all' });
  }
};

// ── Reorder ───────────────────────────────────────────────────────────────────
exports.reorder = async (req, res) => {
  try {
    const { type, items } = req.body; // items: [{id, order_index}]
    if (!Array.isArray(items)) return res.status(400).json({ message: 'items must be array' });
    const Model = type === 'module' ? CourseModule : type === 'topic' ? CourseTopic : CourseLesson;
    await Promise.all(items.map(({ id, order_index }) =>
      Model.update({ order_index }, { where: { id, course_id: req.params.courseId } })
    ));
    res.json({ message: 'Reordered' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to reorder' });
  }
};

// ── Lesson image upload ───────────────────────────────────────────────────────
const multer = require('multer');
const path   = require('path');
const fs     = require('fs');

const imgStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(__dirname, '../../uploads/lesson-images');
    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `lesson-${Date.now()}${ext}`);
  },
});
const imgUpload = multer({
  storage: imgStorage,
  limits: { fileSize: 8 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = ['.jpg', '.jpeg', '.png', '.webp', '.gif', '.svg'];
    if (allowed.includes(path.extname(file.originalname).toLowerCase())) cb(null, true);
    else cb(new Error('Only jpg/png/webp/gif/svg allowed'));
  },
});
exports.uploadImageMiddleware = imgUpload.single('image');

exports.uploadLessonImage = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: 'No image uploaded' });
    const url = `/uploads/lesson-images/${req.file.filename}`;
    res.json({ url });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Upload failed' });
  }
};
