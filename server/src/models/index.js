const sequelize     = require('../config/db');
const Organization  = require('./Organization');
const User          = require('./User');
const Session       = require('./Session');
const AuditLog      = require('./AuditLog');
const Question      = require('./Question');
const QuestionOption = require('./QuestionOption');
const TestCase      = require('./TestCase');
const Language      = require('./Language');
const Submission    = require('./Submission');
const SubmissionResult = require('./SubmissionResult');
const Notification  = require('./Notification');
const QuestionBank  = require('./QuestionBank');
const LabProblem    = require('./LabProblem');
const LabGroup      = require('./LabGroup');
const LabProblemGroup = require('./LabProblemGroup');
const LabSubmission = require('./LabSubmission');
const DailyChallenge = require('./DailyChallenge');
const DailyChallengeSubmission = require('./DailyChallengeSubmission');
const Contest             = require('./Contest');
const ContestProblem      = require('./ContestProblem');
const ContestRegistration = require('./ContestRegistration');
const ContestSubmission   = require('./ContestSubmission');
const EngLabFolder  = require('./EngLabFolder');
const VerilogProblem    = require('./VerilogProblem');
const VerilogSubmission = require('./VerilogSubmission');
const TestAttempt = require('./TestAttempt');

// ── Learn models ─────────────────────────────────────────────────────────────
const CourseTemplate        = require('./CourseTemplate');
const CourseTemplateVersion = require('./CourseTemplateVersion');
const Course                = require('./Course');
const CourseModule          = require('./CourseModule');
const CourseTopic           = require('./CourseTopic');
const CourseLesson          = require('./CourseLesson');
const CourseEnrollment      = require('./CourseEnrollment');
const LessonProgress        = require('./LessonProgress');
const CourseQuiz            = require('./CourseQuiz');
const CourseQuizQuestion    = require('./CourseQuizQuestion');
const CourseQuizAttempt     = require('./CourseQuizAttempt');
const LessonNote            = require('./LessonNote');
const LessonBookmark        = require('./LessonBookmark');
const CourseCertificate     = require('./CourseCertificate');

// ── Associations ─────────────────────────────────────────────────────────────
Organization.hasMany(User,     { foreignKey: 'org_id', as: 'users' });
User.belongsTo(Organization,   { foreignKey: 'org_id', as: 'organization' });
User.hasMany(Session,          { foreignKey: 'user_id', as: 'sessions' });
Session.belongsTo(User,        { foreignKey: 'user_id', as: 'user' });
User.hasMany(TestAttempt,      { foreignKey: 'user_id', as: 'test_attempts', onDelete: 'CASCADE' });
Question.hasMany(TestAttempt,  { foreignKey: 'question_id', as: 'attempts', onDelete: 'CASCADE' });
TestAttempt.belongsTo(User,    { foreignKey: 'user_id', as: 'student' });
TestAttempt.belongsTo(Question,{ foreignKey: 'question_id', as: 'question' });
Submission.belongsTo(TestAttempt,{ foreignKey: 'attempt_id', as: 'attempt' });
AuditLog.belongsTo(User,       { foreignKey: 'user_id', as: 'actor' });

Question.hasMany(QuestionOption, { foreignKey: 'question_id', as: 'options',    onDelete: 'CASCADE' });
QuestionOption.belongsTo(Question, { foreignKey: 'question_id' });
Question.hasMany(TestCase,       { foreignKey: 'question_id', as: 'test_cases', onDelete: 'CASCADE' });
TestCase.belongsTo(Question,     { foreignKey: 'question_id' });
Question.belongsTo(User,         { foreignKey: 'created_by',  as: 'author' });
Question.belongsTo(Organization, { foreignKey: 'org_id',      as: 'organization' });

Submission.belongsTo(Question,  { foreignKey: 'question_id', as: 'question' });
Submission.belongsTo(User,      { foreignKey: 'user_id',     as: 'student' });
Submission.belongsTo(Language,  { foreignKey: 'language_id', as: 'language' });
Submission.hasMany(SubmissionResult, { foreignKey: 'submission_id', as: 'results', onDelete: 'CASCADE' });
SubmissionResult.belongsTo(Submission, { foreignKey: 'submission_id' });
SubmissionResult.belongsTo(TestCase,   { foreignKey: 'test_case_id', as: 'test_case' });

Notification.belongsTo(User, { foreignKey: 'user_id', as: 'recipient' });
User.hasMany(Notification,   { foreignKey: 'user_id', as: 'notifications', onDelete: 'CASCADE' });

QuestionBank.belongsTo(Organization, { foreignKey: 'org_id',     as: 'organization' });
QuestionBank.belongsTo(User,         { foreignKey: 'created_by', as: 'creator' });
QuestionBank.hasMany(Question,       { foreignKey: 'bank_id',    as: 'questions', onDelete: 'SET NULL' });
Question.belongsTo(QuestionBank,     { foreignKey: 'bank_id',    as: 'bank' });

LabProblem.belongsTo(User,    { foreignKey: 'created_by', as: 'creator' });
LabProblem.belongsTo(LabGroup,{ foreignKey: 'group_id',   as: 'group' });
LabGroup.hasMany(LabProblem,  { foreignKey: 'group_id',   as: 'problems' });
LabProblem.belongsToMany(LabGroup,   { through: LabProblemGroup, foreignKey: 'problem_id', otherKey: 'group_id',  as: 'groups' });
LabGroup.belongsToMany(LabProblem,   { through: LabProblemGroup, foreignKey: 'group_id',   otherKey: 'problem_id', as: 'assigned_problems' });
LabSubmission.belongsTo(LabProblem,  { foreignKey: 'problem_id', as: 'problem' });
LabSubmission.belongsTo(User,        { foreignKey: 'user_id',    as: 'student' });
LabProblem.hasMany(LabSubmission,    { foreignKey: 'problem_id', as: 'submissions', onDelete: 'CASCADE' });

DailyChallenge.belongsTo(LabProblem, { foreignKey: 'problem_id', as: 'problem' });
DailyChallenge.belongsTo(User,       { foreignKey: 'created_by', as: 'creator' });
DailyChallenge.hasMany(DailyChallengeSubmission, { foreignKey: 'challenge_id', as: 'dc_submissions', onDelete: 'CASCADE' });
DailyChallengeSubmission.belongsTo(DailyChallenge, { foreignKey: 'challenge_id', as: 'challenge' });
DailyChallengeSubmission.belongsTo(User,           { foreignKey: 'user_id',      as: 'student' });
DailyChallengeSubmission.belongsTo(LabProblem,     { foreignKey: 'problem_id',   as: 'problem' });

Contest.belongsTo(User,              { foreignKey: 'created_by', as: 'creator' });
Contest.hasMany(ContestProblem,      { foreignKey: 'contest_id', as: 'contest_problems', onDelete: 'CASCADE' });
Contest.hasMany(ContestRegistration, { foreignKey: 'contest_id', as: 'registrations',    onDelete: 'CASCADE' });
Contest.hasMany(ContestSubmission,   { foreignKey: 'contest_id', as: 'contest_submissions', onDelete: 'CASCADE' });
ContestProblem.belongsTo(Contest,    { foreignKey: 'contest_id' });
ContestProblem.belongsTo(LabProblem, { foreignKey: 'problem_id',  as: 'problem' });
ContestProblem.belongsTo(Question,   { foreignKey: 'question_id', as: 'question' });
ContestRegistration.belongsTo(Contest, { foreignKey: 'contest_id' });
ContestRegistration.belongsTo(User,    { foreignKey: 'user_id', as: 'student' });
ContestSubmission.belongsTo(Contest,   { foreignKey: 'contest_id' });
ContestSubmission.belongsTo(User,      { foreignKey: 'user_id',     as: 'student' });
ContestSubmission.belongsTo(LabProblem,{ foreignKey: 'problem_id',  as: 'problem' });
ContestSubmission.belongsTo(Question,  { foreignKey: 'question_id', as: 'question' });

// ── Learn associations ───────────────────────────────────────────────────────
CourseTemplate.belongsTo(User,               { foreignKey: 'created_by',  as: 'creator' });
CourseTemplate.hasMany(CourseTemplateVersion,{ foreignKey: 'template_id', as: 'versions', onDelete: 'CASCADE' });
CourseTemplateVersion.belongsTo(CourseTemplate, { foreignKey: 'template_id', as: 'template' });
CourseTemplateVersion.belongsTo(User,        { foreignKey: 'published_by', as: 'publisher' });

Course.belongsTo(User,            { foreignKey: 'created_by',  as: 'creator' });
Course.belongsTo(CourseTemplate,  { foreignKey: 'template_id', as: 'template' });
Course.hasMany(CourseModule,      { foreignKey: 'course_id',   as: 'modules',      onDelete: 'CASCADE' });
Course.hasMany(CourseTopic,       { foreignKey: 'course_id',   as: 'topics',       onDelete: 'CASCADE' });
Course.hasMany(CourseLesson,      { foreignKey: 'course_id',   as: 'lessons',      onDelete: 'CASCADE' });
Course.hasMany(CourseEnrollment,  { foreignKey: 'course_id',   as: 'enrollments',  onDelete: 'CASCADE' });
Course.hasMany(CourseQuiz,        { foreignKey: 'course_id',   as: 'quizzes',      onDelete: 'CASCADE' });
Course.hasMany(CourseCertificate, { foreignKey: 'course_id',   as: 'certificates', onDelete: 'CASCADE' });

CourseModule.belongsTo(Course,    { foreignKey: 'course_id',  as: 'course' });
CourseModule.hasMany(CourseTopic, { foreignKey: 'module_id',  as: 'topics',  onDelete: 'CASCADE' });
CourseModule.hasMany(CourseLesson,{ foreignKey: 'module_id',  as: 'lessons', onDelete: 'CASCADE' });

CourseTopic.belongsTo(CourseModule, { foreignKey: 'module_id', as: 'module' });
CourseTopic.belongsTo(Course,       { foreignKey: 'course_id', as: 'course' });
CourseTopic.hasMany(CourseLesson,   { foreignKey: 'topic_id',  as: 'lessons', onDelete: 'CASCADE' });

CourseLesson.belongsTo(CourseTopic,  { foreignKey: 'topic_id',  as: 'topic' });
CourseLesson.belongsTo(CourseModule, { foreignKey: 'module_id', as: 'module' });
CourseLesson.belongsTo(Course,       { foreignKey: 'course_id', as: 'course' });
CourseLesson.hasMany(LessonProgress, { foreignKey: 'lesson_id', as: 'progress_records', onDelete: 'CASCADE' });
CourseLesson.hasMany(LessonNote,     { foreignKey: 'lesson_id', as: 'notes',    onDelete: 'CASCADE' });
CourseLesson.hasMany(LessonBookmark, { foreignKey: 'lesson_id', as: 'bookmarks',onDelete: 'CASCADE' });

CourseEnrollment.belongsTo(User,   { foreignKey: 'user_id',   as: 'student' });
CourseEnrollment.belongsTo(Course, { foreignKey: 'course_id', as: 'course' });
CourseEnrollment.hasMany(LessonProgress, { foreignKey: 'enrollment_id', as: 'lesson_progress', onDelete: 'CASCADE' });
User.hasMany(CourseEnrollment,     { foreignKey: 'user_id',   as: 'enrollments', onDelete: 'CASCADE' });

LessonProgress.belongsTo(CourseEnrollment, { foreignKey: 'enrollment_id', as: 'enrollment' });
LessonProgress.belongsTo(CourseLesson,     { foreignKey: 'lesson_id',     as: 'lesson' });
LessonProgress.belongsTo(User,             { foreignKey: 'user_id',       as: 'student' });

CourseQuiz.belongsTo(Course,       { foreignKey: 'course_id', as: 'course' });
CourseQuiz.belongsTo(CourseLesson, { foreignKey: 'lesson_id', as: 'lesson' });
CourseQuiz.belongsTo(CourseModule, { foreignKey: 'module_id', as: 'module' });
CourseQuiz.hasMany(CourseQuizQuestion, { foreignKey: 'quiz_id', as: 'questions', onDelete: 'CASCADE' });
CourseQuiz.hasMany(CourseQuizAttempt,  { foreignKey: 'quiz_id', as: 'attempts',  onDelete: 'CASCADE' });

CourseQuizQuestion.belongsTo(CourseQuiz, { foreignKey: 'quiz_id', as: 'quiz' });
CourseQuizAttempt.belongsTo(CourseQuiz,  { foreignKey: 'quiz_id', as: 'quiz' });
CourseQuizAttempt.belongsTo(User,        { foreignKey: 'user_id', as: 'student' });
User.hasMany(CourseQuizAttempt,          { foreignKey: 'user_id', as: 'quiz_attempts', onDelete: 'CASCADE' });

LessonNote.belongsTo(User,         { foreignKey: 'user_id',   as: 'student' });
LessonNote.belongsTo(CourseLesson, { foreignKey: 'lesson_id', as: 'lesson' });
User.hasMany(LessonNote,           { foreignKey: 'user_id',   as: 'lesson_notes', onDelete: 'CASCADE' });

LessonBookmark.belongsTo(User,         { foreignKey: 'user_id',   as: 'student' });
LessonBookmark.belongsTo(CourseLesson, { foreignKey: 'lesson_id', as: 'lesson' });
User.hasMany(LessonBookmark,           { foreignKey: 'user_id',   as: 'lesson_bookmarks', onDelete: 'CASCADE' });

CourseCertificate.belongsTo(User,   { foreignKey: 'user_id',   as: 'student' });
CourseCertificate.belongsTo(Course, { foreignKey: 'course_id', as: 'course' });
User.hasMany(CourseCertificate,     { foreignKey: 'user_id',   as: 'certificates', onDelete: 'CASCADE' });

EngLabFolder.belongsTo(User,         { foreignKey: 'created_by', as: 'creator' });
EngLabFolder.belongsTo(Organization, { foreignKey: 'org_id',     as: 'organization' });
EngLabFolder.hasMany(QuestionBank,   { foreignKey: 'folder_id',  as: 'banks', onDelete: 'SET NULL' });
QuestionBank.belongsTo(EngLabFolder, { foreignKey: 'folder_id',  as: 'folder' });

const syncDB = async ({ force = false, alter = false } = {}) => {
  const allowSync = process.env.ALLOW_DB_SYNC === 'true';
  if (allowSync && ['production', 'staging'].includes(process.env.NODE_ENV)) {
    throw new Error('Sequelize sync is disabled in deployment environments; apply reviewed migrations instead.');
  }
  if (!allowSync) {
    console.log('Database auto-sync disabled; run migrations explicitly in a controlled environment.');
    return { skipped: true };
  }

  await sequelize.sync({ force, alter });
  console.log('Database synced');
  return { skipped: false };
};

module.exports = {
  sequelize, syncDB,
  Organization, User, Session, AuditLog,
  QuestionBank, Question, QuestionOption, TestCase,
  Language, Submission, SubmissionResult, TestAttempt,
  Notification,
  LabGroup, LabProblemGroup, LabProblem, LabSubmission,
  DailyChallenge, DailyChallengeSubmission,
  Contest, ContestProblem, ContestRegistration, ContestSubmission,
  EngLabFolder,
  VerilogProblem, VerilogSubmission,
  // Learn
  CourseTemplate, CourseTemplateVersion,
  Course, CourseModule, CourseTopic, CourseLesson,
  CourseEnrollment, LessonProgress,
  CourseQuiz, CourseQuizQuestion, CourseQuizAttempt,
  LessonNote, LessonBookmark, CourseCertificate,
};
