'use strict';
const { LessonNote, LessonBookmark, CourseLesson, CourseEnrollment, CourseCertificate, Course } = require('../models');
const crypto = require('crypto');

// ── Notes ─────────────────────────────────────────────────────────────────────
exports.getNotes = async (req, res) => {
  try {
    const notes = await LessonNote.findAll({
      where: { user_id: req.user.id, lesson_id: req.params.lessonId },
      order: [['created_at','DESC']],
    });
    res.json({ notes });
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch notes' });
  }
};

exports.saveNote = async (req, res) => {
  try {
    const { content } = req.body;
    if (!content?.trim()) return res.status(400).json({ message: 'Content required' });
    // Verify lesson exists and student is enrolled
    const lesson = await CourseLesson.findByPk(req.params.lessonId);
    if (!lesson) return res.status(404).json({ message: 'Lesson not found' });
    const enrollment = await CourseEnrollment.findOne({ where: { user_id: req.user.id, course_id: lesson.course_id } });
    if (!enrollment) return res.status(403).json({ message: 'Not enrolled' });

    const note = await LessonNote.create({ user_id: req.user.id, lesson_id: req.params.lessonId, content: content.trim() });
    res.status(201).json({ note });
  } catch (err) {
    res.status(500).json({ message: 'Failed to save note' });
  }
};

exports.updateNote = async (req, res) => {
  try {
    const note = await LessonNote.findOne({ where: { id: req.params.noteId, user_id: req.user.id } });
    if (!note) return res.status(404).json({ message: 'Note not found' });
    const { content } = req.body;
    if (!content?.trim()) return res.status(400).json({ message: 'Content required' });
    await note.update({ content: content.trim() });
    res.json({ note });
  } catch (err) {
    res.status(500).json({ message: 'Failed to update note' });
  }
};

exports.deleteNote = async (req, res) => {
  try {
    const note = await LessonNote.findOne({ where: { id: req.params.noteId, user_id: req.user.id } });
    if (!note) return res.status(404).json({ message: 'Note not found' });
    await note.destroy();
    res.json({ message: 'Note deleted' });
  } catch (err) {
    res.status(500).json({ message: 'Failed to delete note' });
  }
};

// ── Bookmarks ─────────────────────────────────────────────────────────────────
exports.getBookmarks = async (req, res) => {
  try {
    const bookmarks = await LessonBookmark.findAll({
      where: { user_id: req.user.id },
      include: [{ model: CourseLesson, as: 'lesson', attributes: ['id','title','course_id'] }],
      order: [['created_at','DESC']],
    });
    res.json({ bookmarks });
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch bookmarks' });
  }
};

exports.toggleBookmark = async (req, res) => {
  try {
    const lesson = await CourseLesson.findByPk(req.params.lessonId);
    if (!lesson) return res.status(404).json({ message: 'Lesson not found' });
    const enrollment = await CourseEnrollment.findOne({ where: { user_id: req.user.id, course_id: lesson.course_id } });
    if (!enrollment) return res.status(403).json({ message: 'Not enrolled' });

    const existing = await LessonBookmark.findOne({ where: { user_id: req.user.id, lesson_id: req.params.lessonId } });
    if (existing) {
      await existing.destroy();
      return res.json({ bookmarked: false });
    }
    await LessonBookmark.create({ user_id: req.user.id, lesson_id: req.params.lessonId });
    res.json({ bookmarked: true });
  } catch (err) {
    res.status(500).json({ message: 'Failed to toggle bookmark' });
  }
};

// ── Certificates ──────────────────────────────────────────────────────────────
exports.getCertificates = async (req, res) => {
  try {
    const certs = await CourseCertificate.findAll({
      where: { user_id: req.user.id },
      include: [{ model: Course, as: 'course', attributes: ['id','title','slug'] }],
      order: [['issued_at','DESC']],
    });
    res.json({ certificates: certs });
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch certificates' });
  }
};

exports.verifyCertificate = async (req, res) => {
  try {
    const cert = await CourseCertificate.findOne({
      where: { certificate_id: req.params.certId },
      include: [
        { model: Course, as: 'course', attributes: ['id','title','slug'] },
        { model: require('../models').User, as: 'student', attributes: ['id','name'] },
      ],
    });
    if (!cert) return res.status(404).json({ message: 'Certificate not found' });
    res.json({ certificate: cert });
  } catch (err) {
    res.status(500).json({ message: 'Failed to verify certificate' });
  }
};

exports.issueCertificate = async (req, res) => {
  try {
    const enrollment = await CourseEnrollment.findOne({
      where: { user_id: req.user.id, course_id: req.params.courseId },
    });
    if (!enrollment) return res.status(403).json({ message: 'Not enrolled' });
    if (enrollment.progress < 100) return res.status(400).json({ message: 'Course not completed yet' });

    const existing = await CourseCertificate.findOne({ where: { user_id: req.user.id, course_id: req.params.courseId } });
    if (existing) return res.json({ certificate: existing });

    const certificate_id = crypto.randomBytes(16).toString('hex').toUpperCase();
    const cert = await CourseCertificate.create({
      user_id: req.user.id,
      course_id: req.params.courseId,
      certificate_id,
      issued_at: new Date(),
    });
    res.status(201).json({ certificate: cert });
  } catch (err) {
    res.status(500).json({ message: 'Failed to issue certificate' });
  }
};
