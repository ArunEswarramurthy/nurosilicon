'use strict';
// All NuroSilicon Learn tables use the ns_learn_ prefix to avoid conflicts
// with the existing LMS schema already present in the database.

module.exports = {
  async up(queryInterface, Sequelize) {

    // 1. ns_learn_templates
    await queryInterface.createTable('ns_learn_templates', {
      id:          { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true },
      name:        { type: Sequelize.STRING(200), allowNull: false },
      description: { type: Sequelize.TEXT },
      preset:      { type: Sequelize.ENUM('documentation','split_screen','video_course','custom'), defaultValue: 'custom' },
      status:      { type: Sequelize.ENUM('draft','published','archived'), defaultValue: 'draft' },
      is_default:  { type: Sequelize.BOOLEAN, defaultValue: false },
      config:      { type: Sequelize.JSON, allowNull: false, defaultValue: {} },
      created_by:  { type: Sequelize.UUID, references: { model: 'users', key: 'id' }, onDelete: 'SET NULL' },
      created_at:  { type: Sequelize.DATE, allowNull: false },
      updated_at:  { type: Sequelize.DATE, allowNull: false },
    });

    // 2. ns_learn_template_versions
    await queryInterface.createTable('ns_learn_template_versions', {
      id:           { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true },
      template_id:  { type: Sequelize.UUID, allowNull: false, references: { model: 'ns_learn_templates', key: 'id' }, onDelete: 'CASCADE' },
      version:      { type: Sequelize.INTEGER, allowNull: false },
      config:       { type: Sequelize.JSON, allowNull: false },
      published_by: { type: Sequelize.UUID, references: { model: 'users', key: 'id' }, onDelete: 'SET NULL' },
      published_at: { type: Sequelize.DATE },
      created_at:   { type: Sequelize.DATE, allowNull: false },
      updated_at:   { type: Sequelize.DATE, allowNull: false },
    });
    await queryInterface.addIndex('ns_learn_template_versions', ['template_id', 'version'], { unique: true, name: 'nlt_ver_unique' });

    // 3. ns_learn_courses
    await queryInterface.createTable('ns_learn_courses', {
      id:                  { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true },
      title:               { type: Sequelize.STRING(300), allowNull: false },
      slug:                { type: Sequelize.STRING(300), allowNull: false, unique: true },
      summary:             { type: Sequelize.STRING(500) },
      description:         { type: Sequelize.TEXT },
      category:            { type: Sequelize.STRING(100) },
      difficulty:          { type: Sequelize.ENUM('beginner','intermediate','advanced'), defaultValue: 'beginner' },
      cover_image_url:     { type: Sequelize.STRING(500) },
      learning_objectives: { type: Sequelize.JSON, defaultValue: [] },
      prerequisites:       { type: Sequelize.JSON, defaultValue: [] },
      estimated_duration:  { type: Sequelize.INTEGER, defaultValue: 0 },
      tags:                { type: Sequelize.JSON, defaultValue: [] },
      status:              { type: Sequelize.ENUM('draft','published','archived'), defaultValue: 'draft' },
      is_featured:         { type: Sequelize.BOOLEAN, defaultValue: false },
      template_id:         { type: Sequelize.UUID, references: { model: 'ns_learn_templates', key: 'id' }, onDelete: 'SET NULL' },
      template_version:    { type: Sequelize.INTEGER },
      created_by:          { type: Sequelize.UUID, references: { model: 'users', key: 'id' }, onDelete: 'SET NULL' },
      published_at:        { type: Sequelize.DATE },
      created_at:          { type: Sequelize.DATE, allowNull: false },
      updated_at:          { type: Sequelize.DATE, allowNull: false },
    });
    await queryInterface.addIndex('ns_learn_courses', ['slug'], { name: 'nlc_slug' });
    await queryInterface.addIndex('ns_learn_courses', ['status'], { name: 'nlc_status' });

    // 4. ns_learn_modules
    await queryInterface.createTable('ns_learn_modules', {
      id:          { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true },
      course_id:   { type: Sequelize.UUID, allowNull: false, references: { model: 'ns_learn_courses', key: 'id' }, onDelete: 'CASCADE' },
      title:       { type: Sequelize.STRING(300), allowNull: false },
      description: { type: Sequelize.TEXT },
      order_index: { type: Sequelize.INTEGER, defaultValue: 0 },
      status:      { type: Sequelize.ENUM('draft','published'), defaultValue: 'draft' },
      created_at:  { type: Sequelize.DATE, allowNull: false },
      updated_at:  { type: Sequelize.DATE, allowNull: false },
    });
    await queryInterface.addIndex('ns_learn_modules', ['course_id', 'order_index'], { name: 'nlm_course_order' });

    // 5. ns_learn_topics
    await queryInterface.createTable('ns_learn_topics', {
      id:          { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true },
      module_id:   { type: Sequelize.UUID, allowNull: false, references: { model: 'ns_learn_modules', key: 'id' }, onDelete: 'CASCADE' },
      course_id:   { type: Sequelize.UUID, allowNull: false, references: { model: 'ns_learn_courses', key: 'id' }, onDelete: 'CASCADE' },
      title:       { type: Sequelize.STRING(300), allowNull: false },
      description: { type: Sequelize.TEXT },
      order_index: { type: Sequelize.INTEGER, defaultValue: 0 },
      status:      { type: Sequelize.ENUM('draft','published'), defaultValue: 'draft' },
      created_at:  { type: Sequelize.DATE, allowNull: false },
      updated_at:  { type: Sequelize.DATE, allowNull: false },
    });
    await queryInterface.addIndex('ns_learn_topics', ['module_id', 'order_index'], { name: 'nlt_mod_order' });

    // 6. ns_learn_lessons
    await queryInterface.createTable('ns_learn_lessons', {
      id:                 { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true },
      topic_id:           { type: Sequelize.UUID, allowNull: false, references: { model: 'ns_learn_topics', key: 'id' }, onDelete: 'CASCADE' },
      module_id:          { type: Sequelize.UUID, allowNull: false, references: { model: 'ns_learn_modules', key: 'id' }, onDelete: 'CASCADE' },
      course_id:          { type: Sequelize.UUID, allowNull: false, references: { model: 'ns_learn_courses', key: 'id' }, onDelete: 'CASCADE' },
      title:              { type: Sequelize.STRING(300), allowNull: false },
      content_blocks:     { type: Sequelize.JSON, defaultValue: [] },
      order_index:        { type: Sequelize.INTEGER, defaultValue: 0 },
      estimated_duration: { type: Sequelize.INTEGER, defaultValue: 0 },
      status:             { type: Sequelize.ENUM('draft','published'), defaultValue: 'draft' },
      is_free_preview:    { type: Sequelize.BOOLEAN, defaultValue: false },
      created_at:         { type: Sequelize.DATE, allowNull: false },
      updated_at:         { type: Sequelize.DATE, allowNull: false },
    });
    await queryInterface.addIndex('ns_learn_lessons', ['topic_id', 'order_index'], { name: 'nll_topic_order' });
    await queryInterface.addIndex('ns_learn_lessons', ['course_id'], { name: 'nll_course' });

    // 7. ns_learn_enrollments
    await queryInterface.createTable('ns_learn_enrollments', {
      id:               { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true },
      user_id:          { type: Sequelize.UUID, allowNull: false, references: { model: 'users', key: 'id' }, onDelete: 'CASCADE' },
      course_id:        { type: Sequelize.UUID, allowNull: false, references: { model: 'ns_learn_courses', key: 'id' }, onDelete: 'CASCADE' },
      progress:         { type: Sequelize.FLOAT, defaultValue: 0 },
      last_lesson_id:   { type: Sequelize.UUID },
      last_accessed_at: { type: Sequelize.DATE },
      completed_at:     { type: Sequelize.DATE },
      created_at:       { type: Sequelize.DATE, allowNull: false },
      updated_at:       { type: Sequelize.DATE, allowNull: false },
    });
    await queryInterface.addIndex('ns_learn_enrollments', ['user_id', 'course_id'], { unique: true, name: 'nle_user_course' });
    await queryInterface.addIndex('ns_learn_enrollments', ['course_id'], { name: 'nle_course' });

    // 8. ns_learn_lesson_progress
    await queryInterface.createTable('ns_learn_lesson_progress', {
      id:            { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true },
      enrollment_id: { type: Sequelize.UUID, allowNull: false, references: { model: 'ns_learn_enrollments', key: 'id' }, onDelete: 'CASCADE' },
      lesson_id:     { type: Sequelize.UUID, allowNull: false, references: { model: 'ns_learn_lessons', key: 'id' }, onDelete: 'CASCADE' },
      user_id:       { type: Sequelize.UUID, allowNull: false, references: { model: 'users', key: 'id' }, onDelete: 'CASCADE' },
      completed:     { type: Sequelize.BOOLEAN, defaultValue: false },
      completed_at:  { type: Sequelize.DATE },
      created_at:    { type: Sequelize.DATE, allowNull: false },
      updated_at:    { type: Sequelize.DATE, allowNull: false },
    });
    await queryInterface.addIndex('ns_learn_lesson_progress', ['enrollment_id', 'lesson_id'], { unique: true, name: 'nllp_enroll_lesson' });
    await queryInterface.addIndex('ns_learn_lesson_progress', ['user_id'], { name: 'nllp_user' });

    // 9. ns_learn_quizzes
    await queryInterface.createTable('ns_learn_quizzes', {
      id:                 { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true },
      course_id:          { type: Sequelize.UUID, allowNull: false, references: { model: 'ns_learn_courses', key: 'id' }, onDelete: 'CASCADE' },
      lesson_id:          { type: Sequelize.UUID, references: { model: 'ns_learn_lessons', key: 'id' }, onDelete: 'SET NULL' },
      module_id:          { type: Sequelize.UUID, references: { model: 'ns_learn_modules', key: 'id' }, onDelete: 'SET NULL' },
      title:              { type: Sequelize.STRING(300), allowNull: false },
      instructions:       { type: Sequelize.TEXT },
      time_limit:         { type: Sequelize.INTEGER },
      passing_percentage: { type: Sequelize.FLOAT, defaultValue: 60 },
      total_marks:        { type: Sequelize.FLOAT, defaultValue: 0 },
      max_attempts:       { type: Sequelize.INTEGER, defaultValue: 3 },
      randomize:          { type: Sequelize.BOOLEAN, defaultValue: false },
      show_explanations:  { type: Sequelize.BOOLEAN, defaultValue: true },
      status:             { type: Sequelize.ENUM('draft','published'), defaultValue: 'draft' },
      created_at:         { type: Sequelize.DATE, allowNull: false },
      updated_at:         { type: Sequelize.DATE, allowNull: false },
    });
    await queryInterface.addIndex('ns_learn_quizzes', ['course_id'], { name: 'nlq_course' });
    await queryInterface.addIndex('ns_learn_quizzes', ['lesson_id'], { name: 'nlq_lesson' });

    // 10. ns_learn_quiz_questions
    await queryInterface.createTable('ns_learn_quiz_questions', {
      id:          { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true },
      quiz_id:     { type: Sequelize.UUID, allowNull: false, references: { model: 'ns_learn_quizzes', key: 'id' }, onDelete: 'CASCADE' },
      type:        { type: Sequelize.ENUM('mcq','true_false','fill_blank','short_answer'), allowNull: false },
      text:        { type: Sequelize.TEXT, allowNull: false },
      options:     { type: Sequelize.JSON, defaultValue: [] },
      correct:     { type: Sequelize.JSON },
      marks:       { type: Sequelize.FLOAT, defaultValue: 1 },
      explanation: { type: Sequelize.TEXT },
      order_index: { type: Sequelize.INTEGER, defaultValue: 0 },
      created_at:  { type: Sequelize.DATE, allowNull: false },
      updated_at:  { type: Sequelize.DATE, allowNull: false },
    });
    await queryInterface.addIndex('ns_learn_quiz_questions', ['quiz_id', 'order_index'], { name: 'nlqq_quiz_order' });

    // 11. ns_learn_quiz_attempts
    await queryInterface.createTable('ns_learn_quiz_attempts', {
      id:           { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true },
      quiz_id:      { type: Sequelize.UUID, allowNull: false, references: { model: 'ns_learn_quizzes', key: 'id' }, onDelete: 'CASCADE' },
      user_id:      { type: Sequelize.UUID, allowNull: false, references: { model: 'users', key: 'id' }, onDelete: 'CASCADE' },
      attempt_no:   { type: Sequelize.INTEGER, allowNull: false },
      answers:      { type: Sequelize.JSON, defaultValue: {} },
      score:        { type: Sequelize.FLOAT },
      passed:       { type: Sequelize.BOOLEAN },
      started_at:   { type: Sequelize.DATE },
      submitted_at: { type: Sequelize.DATE },
      created_at:   { type: Sequelize.DATE, allowNull: false },
      updated_at:   { type: Sequelize.DATE, allowNull: false },
    });
    await queryInterface.addIndex('ns_learn_quiz_attempts', ['quiz_id', 'user_id'], { name: 'nlqa_quiz_user' });
    await queryInterface.addIndex('ns_learn_quiz_attempts', ['quiz_id', 'user_id', 'attempt_no'], { unique: true, name: 'nlqa_unique_attempt' });

    // 12. ns_learn_notes
    await queryInterface.createTable('ns_learn_notes', {
      id:         { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true },
      user_id:    { type: Sequelize.UUID, allowNull: false, references: { model: 'users', key: 'id' }, onDelete: 'CASCADE' },
      lesson_id:  { type: Sequelize.UUID, allowNull: false, references: { model: 'ns_learn_lessons', key: 'id' }, onDelete: 'CASCADE' },
      content:    { type: Sequelize.TEXT, allowNull: false },
      created_at: { type: Sequelize.DATE, allowNull: false },
      updated_at: { type: Sequelize.DATE, allowNull: false },
    });
    await queryInterface.addIndex('ns_learn_notes', ['user_id', 'lesson_id'], { name: 'nln_user_lesson' });

    // 13. ns_learn_bookmarks
    await queryInterface.createTable('ns_learn_bookmarks', {
      id:         { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true },
      user_id:    { type: Sequelize.UUID, allowNull: false, references: { model: 'users', key: 'id' }, onDelete: 'CASCADE' },
      lesson_id:  { type: Sequelize.UUID, allowNull: false, references: { model: 'ns_learn_lessons', key: 'id' }, onDelete: 'CASCADE' },
      created_at: { type: Sequelize.DATE, allowNull: false },
      updated_at: { type: Sequelize.DATE, allowNull: false },
    });
    await queryInterface.addIndex('ns_learn_bookmarks', ['user_id', 'lesson_id'], { unique: true, name: 'nlb_user_lesson' });

    // 14. ns_learn_certificates
    await queryInterface.createTable('ns_learn_certificates', {
      id:             { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true },
      user_id:        { type: Sequelize.UUID, allowNull: false, references: { model: 'users', key: 'id' }, onDelete: 'CASCADE' },
      course_id:      { type: Sequelize.UUID, allowNull: false, references: { model: 'ns_learn_courses', key: 'id' }, onDelete: 'CASCADE' },
      certificate_id: { type: Sequelize.STRING(64), allowNull: false, unique: true },
      issued_at:      { type: Sequelize.DATE, allowNull: false },
      created_at:     { type: Sequelize.DATE, allowNull: false },
      updated_at:     { type: Sequelize.DATE, allowNull: false },
    });
    await queryInterface.addIndex('ns_learn_certificates', ['user_id', 'course_id'], { unique: true, name: 'nlcert_user_course' });
  },

  async down(queryInterface) {
    const tables = [
      'ns_learn_certificates','ns_learn_bookmarks','ns_learn_notes',
      'ns_learn_quiz_attempts','ns_learn_quiz_questions','ns_learn_quizzes',
      'ns_learn_lesson_progress','ns_learn_enrollments','ns_learn_lessons',
      'ns_learn_topics','ns_learn_modules','ns_learn_courses',
      'ns_learn_template_versions','ns_learn_templates',
    ];
    await queryInterface.sequelize.query('SET FOREIGN_KEY_CHECKS=0');
    for (const t of tables) await queryInterface.dropTable(t);
    await queryInterface.sequelize.query('SET FOREIGN_KEY_CHECKS=1');
  },
};
