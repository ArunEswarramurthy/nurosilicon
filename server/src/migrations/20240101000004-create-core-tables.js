'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {

    // languages
    await queryInterface.createTable('languages', {
      id:                { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
      name:              { type: Sequelize.STRING(50), allowNull: false, unique: true },
      judge_language_id: { type: Sequelize.INTEGER, allowNull: true },
      monaco_id:         { type: Sequelize.STRING(30), allowNull: false },
      file_extension:    { type: Sequelize.STRING(10), allowNull: false },
      compile_cmd:       { type: Sequelize.STRING(255), allowNull: true },
      run_cmd:           { type: Sequelize.STRING(255), allowNull: false },
      time_limit_ms:     { type: Sequelize.INTEGER, defaultValue: 5000 },
      memory_limit_mb:   { type: Sequelize.INTEGER, defaultValue: 128 },
      is_active:         { type: Sequelize.BOOLEAN, defaultValue: true },
    });

    // audit_logs
    await queryInterface.createTable('audit_logs', {
      id:         { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true },
      user_id:    { type: Sequelize.UUID, allowNull: true },
      action:     { type: Sequelize.STRING, allowNull: false },
      module:     { type: Sequelize.STRING, allowNull: false },
      target_id:  { type: Sequelize.STRING, allowNull: true },
      ip_address: { type: Sequelize.STRING(45) },
      metadata:   { type: Sequelize.JSON, defaultValue: {} },
      created_at: { type: Sequelize.DATE, allowNull: false },
    });
    await queryInterface.addIndex('audit_logs', ['user_id']);

    // notifications
    await queryInterface.createTable('notifications', {
      id:         { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true },
      user_id:    { type: Sequelize.UUID, allowNull: false },
      type: {
        type: Sequelize.ENUM(
          'exam_assigned','exam_starting_soon','result_published',
          'assignment_graded','course_update','notice_posted',
          'batch_access_request','batch_access_response','batch_assigned',
          'review_request','review_decision',
          'slot_assigned','slot_cancelled','general'
        ),
        allowNull: false,
        defaultValue: 'general',
      },
      title:      { type: Sequelize.STRING, allowNull: false },
      body:       { type: Sequelize.TEXT, allowNull: true },
      link:       { type: Sequelize.STRING, allowNull: true },
      is_read:    { type: Sequelize.BOOLEAN, defaultValue: false },
      created_at: { type: Sequelize.DATE, defaultValue: Sequelize.NOW },
    });
    await queryInterface.addIndex('notifications', ['user_id']);
    await queryInterface.addIndex('notifications', ['is_read']);

    // eng_lab_folders
    await queryInterface.createTable('eng_lab_folders', {
      id:          { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true },
      org_id:      { type: Sequelize.UUID, allowNull: true },
      created_by:  { type: Sequelize.UUID, allowNull: false, references: { model: 'users', key: 'id' }, onDelete: 'CASCADE' },
      name:        { type: Sequelize.STRING, allowNull: false },
      description: { type: Sequelize.TEXT, allowNull: true },
      color:       { type: Sequelize.STRING, defaultValue: '#6366f1' },
      icon:        { type: Sequelize.STRING, defaultValue: '📁' },
      order_index: { type: Sequelize.INTEGER, defaultValue: 0 },
      is_archived: { type: Sequelize.BOOLEAN, defaultValue: false },
      created_at:  { type: Sequelize.DATE, allowNull: false },
      updated_at:  { type: Sequelize.DATE, allowNull: false },
    });

    // question_banks
    await queryInterface.createTable('question_banks', {
      id:          { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true },
      org_id:      { type: Sequelize.UUID, allowNull: true },
      created_by:  { type: Sequelize.UUID, allowNull: false, references: { model: 'users', key: 'id' }, onDelete: 'CASCADE' },
      name:        { type: Sequelize.STRING, allowNull: false },
      description: { type: Sequelize.TEXT },
      category:    { type: Sequelize.STRING },
      subject:     { type: Sequelize.STRING },
      bank_type:   { type: Sequelize.STRING, defaultValue: 'mixed' },
      bank_types:  { type: Sequelize.JSON, defaultValue: [] },
      type:        { type: Sequelize.STRING, allowNull: true },
      difficulty_mix: { type: Sequelize.JSON, defaultValue: { easy: 0, medium: 0, hard: 0 } },
      total_marks:    { type: Sequelize.FLOAT, defaultValue: 0 },
      tags:        { type: Sequelize.JSON, defaultValue: [] },
      status:      { type: Sequelize.ENUM('draft','published','archived'), defaultValue: 'draft' },
      is_archived: { type: Sequelize.BOOLEAN, defaultValue: false },
      folder_id:   { type: Sequelize.UUID, allowNull: true, references: { model: 'eng_lab_folders', key: 'id' }, onDelete: 'SET NULL' },
      is_global:   { type: Sequelize.BOOLEAN, defaultValue: false },
      global_request_status: { type: Sequelize.ENUM('none','pending','approved','rejected'), defaultValue: 'none' },
      global_request_note:   { type: Sequelize.TEXT, allowNull: true },
      created_at:  { type: Sequelize.DATE, allowNull: false },
      updated_at:  { type: Sequelize.DATE, allowNull: false },
    });
    await queryInterface.addIndex('question_banks', ['org_id']);
    await queryInterface.addIndex('question_banks', ['created_by']);

    // questions
    await queryInterface.createTable('questions', {
      id:         { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true },
      org_id:     { type: Sequelize.UUID, allowNull: true },
      created_by: { type: Sequelize.UUID, allowNull: false, references: { model: 'users', key: 'id' }, onDelete: 'CASCADE' },
      type: {
        type: Sequelize.ENUM(
          'mcq_single','mcq_multi','true_false','fill_blank',
          'coding','frontend','backend','sql',
          'numerical','circuit_analysis','waveform_analysis',
          'code_output','code_debugging','rtl_coding','design_challenge'
        ),
        allowNull: false,
      },
      title:            { type: Sequelize.STRING, allowNull: false },
      body:             { type: Sequelize.TEXT },
      difficulty:       { type: Sequelize.ENUM('easy','medium','hard'), defaultValue: 'medium' },
      topic:            { type: Sequelize.STRING },
      subtopic:         { type: Sequelize.STRING },
      marks:            { type: Sequelize.FLOAT, defaultValue: 1 },
      negative_marks:   { type: Sequelize.FLOAT, defaultValue: 0 },
      tags:             { type: Sequelize.JSON, defaultValue: [] },
      explanation:      { type: Sequelize.TEXT },
      code_snippet:     { type: Sequelize.TEXT },
      constraints:      { type: Sequelize.TEXT },
      input_format:     { type: Sequelize.TEXT },
      output_format:    { type: Sequelize.TEXT },
      sample_input:     { type: Sequelize.TEXT },
      sample_output:    { type: Sequelize.TEXT },
      testbench:        { type: Sequelize.TEXT, allowNull: true },
      time_limit:       { type: Sequelize.FLOAT, defaultValue: 2.0 },
      memory_limit:     { type: Sequelize.INTEGER, defaultValue: 256 },
      supported_languages: { type: Sequelize.JSON, defaultValue: ['cpp','java','python','c','javascript'] },
      approval_status:  { type: Sequelize.ENUM('pending','approved','rejected'), defaultValue: 'approved' },
      version:          { type: Sequelize.INTEGER, defaultValue: 1 },
      bank_id:          { type: Sequelize.UUID, allowNull: true, references: { model: 'question_banks', key: 'id' }, onDelete: 'SET NULL' },
      branch_id:        { type: Sequelize.UUID, allowNull: true },
      subject_id:       { type: Sequelize.UUID, allowNull: true },
      eng_topic_id:     { type: Sequelize.UUID, allowNull: true },
      created_at:       { type: Sequelize.DATE, allowNull: false },
      updated_at:       { type: Sequelize.DATE, allowNull: false },
    });
    await queryInterface.addIndex('questions', ['org_id']);
    await queryInterface.addIndex('questions', ['created_by']);
    await queryInterface.addIndex('questions', ['type']);
    await queryInterface.addIndex('questions', ['topic']);

    // question_options
    await queryInterface.createTable('question_options', {
      id:          { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true },
      question_id: { type: Sequelize.UUID, allowNull: false, references: { model: 'questions', key: 'id' }, onDelete: 'CASCADE' },
      option_text: { type: Sequelize.TEXT, allowNull: false },
      is_correct:  { type: Sequelize.BOOLEAN, defaultValue: false },
      order_index: { type: Sequelize.INTEGER, defaultValue: 0 },
    });
    await queryInterface.addIndex('question_options', ['question_id']);

    // test_cases
    await queryInterface.createTable('test_cases', {
      id:              { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true },
      question_id:     { type: Sequelize.UUID, allowNull: false, references: { model: 'questions', key: 'id' }, onDelete: 'CASCADE' },
      input:           { type: Sequelize.TEXT },
      expected_output: { type: Sequelize.TEXT },
      is_hidden:       { type: Sequelize.BOOLEAN, defaultValue: false },
      weight:          { type: Sequelize.FLOAT, defaultValue: 1 },
    });
    await queryInterface.addIndex('test_cases', ['question_id']);

    // test_attempts
    await queryInterface.createTable('test_attempts', {
      id:           { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true },
      user_id:      { type: Sequelize.UUID, allowNull: false, references: { model: 'users', key: 'id' }, onDelete: 'CASCADE' },
      question_id:  { type: Sequelize.UUID, allowNull: false, references: { model: 'questions', key: 'id' }, onDelete: 'CASCADE' },
      status:       { type: Sequelize.ENUM('in_progress','submitted','completed','cancelled'), defaultValue: 'in_progress' },
      score:        { type: Sequelize.FLOAT, defaultValue: 0 },
      started_at:   { type: Sequelize.DATE, defaultValue: Sequelize.NOW },
      submitted_at: { type: Sequelize.DATE, allowNull: true },
      completed_at: { type: Sequelize.DATE, allowNull: true },
      metadata:     { type: Sequelize.JSON, allowNull: true },
    });
    await queryInterface.addIndex('test_attempts', ['user_id']);
    await queryInterface.addIndex('test_attempts', ['question_id']);
    await queryInterface.addIndex('test_attempts', ['status']);

    // submissions
    await queryInterface.createTable('submissions', {
      id:                 { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true },
      question_id:        { type: Sequelize.UUID, allowNull: false, references: { model: 'questions', key: 'id' }, onDelete: 'CASCADE' },
      user_id:            { type: Sequelize.UUID, allowNull: false, references: { model: 'users', key: 'id' }, onDelete: 'CASCADE' },
      attempt_id:         { type: Sequelize.UUID, allowNull: true, references: { model: 'test_attempts', key: 'id' }, onDelete: 'SET NULL' },
      language_id:        { type: Sequelize.INTEGER, allowNull: true, references: { model: 'languages', key: 'id' }, onDelete: 'SET NULL' },
      source_code:        { type: Sequelize.TEXT('long'), allowNull: false },
      mode:               { type: Sequelize.ENUM('run','submit'), defaultValue: 'submit' },
      status:             { type: Sequelize.ENUM('pending','running','passed','failed','error','timeout'), defaultValue: 'pending' },
      score:              { type: Sequelize.FLOAT, defaultValue: 0 },
      test_cases_passed:  { type: Sequelize.INTEGER, defaultValue: 0 },
      test_cases_total:   { type: Sequelize.INTEGER, defaultValue: 0 },
      runtime_ms:         { type: Sequelize.INTEGER, allowNull: true },
      memory_kb:          { type: Sequelize.INTEGER, allowNull: true },
      similarity_flagged: { type: Sequelize.BOOLEAN, defaultValue: false },
      similarity_score:   { type: Sequelize.FLOAT, allowNull: true },
      waveform_vcd:       { type: Sequelize.TEXT('long'), allowNull: true },
      compile_error:      { type: Sequelize.TEXT, allowNull: true },
      hdl_results:        { type: Sequelize.TEXT('long'), allowNull: true },
      submitted_at:       { type: Sequelize.DATE, defaultValue: Sequelize.NOW },
    });
    await queryInterface.addIndex('submissions', ['question_id']);
    await queryInterface.addIndex('submissions', ['user_id']);
    await queryInterface.addIndex('submissions', ['attempt_id']);
    await queryInterface.addIndex('submissions', ['status']);

    // submission_results
    await queryInterface.createTable('submission_results', {
      id:            { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true },
      submission_id: { type: Sequelize.UUID, allowNull: false, references: { model: 'submissions', key: 'id' }, onDelete: 'CASCADE' },
      test_case_id:  { type: Sequelize.UUID, allowNull: false, references: { model: 'test_cases', key: 'id' }, onDelete: 'CASCADE' },
      passed:        { type: Sequelize.BOOLEAN, defaultValue: false },
      actual_output: { type: Sequelize.TEXT, allowNull: true },
      runtime_ms:    { type: Sequelize.INTEGER, allowNull: true },
      memory_kb:     { type: Sequelize.INTEGER, allowNull: true },
      error_message: { type: Sequelize.TEXT, allowNull: true },
    });
    await queryInterface.addIndex('submission_results', ['submission_id']);
  },

  async down(queryInterface) {
    const tables = [
      'submission_results','submissions','test_attempts','test_cases',
      'question_options','questions','question_banks','eng_lab_folders',
      'notifications','audit_logs','languages',
    ];
    await queryInterface.sequelize.query('SET FOREIGN_KEY_CHECKS=0');
    for (const t of tables) await queryInterface.dropTable(t);
    await queryInterface.sequelize.query('SET FOREIGN_KEY_CHECKS=1');
  },
};
