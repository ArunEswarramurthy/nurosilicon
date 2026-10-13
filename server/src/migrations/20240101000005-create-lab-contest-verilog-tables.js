'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {

    // lab_groups
    await queryInterface.createTable('lab_groups', {
      id:          { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true },
      name:        { type: Sequelize.STRING, allowNull: false },
      slug:        { type: Sequelize.STRING, allowNull: false, unique: true },
      description: { type: Sequelize.STRING, allowNull: true },
      icon:        { type: Sequelize.STRING, defaultValue: '📚' },
      color:       { type: Sequelize.STRING, defaultValue: '#6366f1' },
      is_active:   { type: Sequelize.BOOLEAN, defaultValue: true },
      created_by:  { type: Sequelize.UUID, allowNull: false, references: { model: 'users', key: 'id' }, onDelete: 'CASCADE' },
      created_at:  { type: Sequelize.DATE, allowNull: false },
      updated_at:  { type: Sequelize.DATE, allowNull: false },
    });

    // lab_problems
    await queryInterface.createTable('lab_problems', {
      id:           { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true },
      question_no:  { type: Sequelize.INTEGER, allowNull: true },
      title:        { type: Sequelize.STRING, allowNull: false },
      description:  { type: Sequelize.TEXT },
      language: {
        type: Sequelize.ENUM('verilog','vhdl','systemverilog','c','cpp','python','java','embedded_c','sql'),
        allowNull: false,
      },
      category:     { type: Sequelize.STRING, defaultValue: 'general' },
      difficulty:   { type: Sequelize.ENUM('easy','medium','hard'), defaultValue: 'easy' },
      level:        { type: Sequelize.INTEGER, defaultValue: 1 },
      marks:        { type: Sequelize.FLOAT, defaultValue: 10 },
      reward_points:    { type: Sequelize.INTEGER, defaultValue: 10 },
      medal_image_url:  { type: Sequelize.STRING, allowNull: true },
      time_limit_s:     { type: Sequelize.INTEGER, defaultValue: 10 },
      starter_code:     { type: Sequelize.TEXT },
      solution_code:    { type: Sequelize.TEXT },
      testbench:        { type: Sequelize.TEXT },
      visible_test_cases:  { type: Sequelize.JSON, defaultValue: [] },
      test_cases:          { type: Sequelize.JSON, defaultValue: [] },
      hidden_test_cases:   { type: Sequelize.JSON, defaultValue: [] },
      allowed_languages:   { type: Sequelize.JSON, defaultValue: [] },
      is_active:    { type: Sequelize.BOOLEAN, defaultValue: true },
      created_by:   { type: Sequelize.UUID, allowNull: false, references: { model: 'users', key: 'id' }, onDelete: 'CASCADE' },
      org_id:       { type: Sequelize.UUID, allowNull: true },
      group_id:     { type: Sequelize.UUID, allowNull: true, references: { model: 'lab_groups', key: 'id' }, onDelete: 'SET NULL' },
      created_at:   { type: Sequelize.DATE, allowNull: false },
      updated_at:   { type: Sequelize.DATE, allowNull: false },
    });
    await queryInterface.addIndex('lab_problems', ['language']);
    await queryInterface.addIndex('lab_problems', ['difficulty']);
    await queryInterface.addIndex('lab_problems', ['level']);
    await queryInterface.addIndex('lab_problems', ['created_by']);
    await queryInterface.addIndex('lab_problems', ['org_id']);
    await queryInterface.addIndex('lab_problems', ['group_id']);

    // lab_problem_groups (junction)
    await queryInterface.createTable('lab_problem_groups', {
      problem_id: { type: Sequelize.UUID, allowNull: false, references: { model: 'lab_problems', key: 'id' }, onDelete: 'CASCADE' },
      group_id:   { type: Sequelize.UUID, allowNull: false, references: { model: 'lab_groups', key: 'id' }, onDelete: 'CASCADE' },
    });
    await queryInterface.addConstraint('lab_problem_groups', {
      fields: ['problem_id', 'group_id'],
      type: 'primary key',
      name: 'lab_problem_groups_pkey',
    });

    // lab_submissions
    await queryInterface.createTable('lab_submissions', {
      id:           { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true },
      problem_id:   { type: Sequelize.UUID, allowNull: false, references: { model: 'lab_problems', key: 'id' }, onDelete: 'CASCADE' },
      user_id:      { type: Sequelize.UUID, allowNull: false, references: { model: 'users', key: 'id' }, onDelete: 'CASCADE' },
      language:     { type: Sequelize.STRING, allowNull: false },
      source_code:  { type: Sequelize.TEXT, allowNull: false },
      mode:         { type: Sequelize.ENUM('run','submit'), defaultValue: 'run' },
      status:       { type: Sequelize.ENUM('pending','running','passed','failed','error','timeout'), defaultValue: 'pending' },
      score:        { type: Sequelize.FLOAT, defaultValue: 0 },
      passed_cases: { type: Sequelize.INTEGER, defaultValue: 0 },
      total_cases:  { type: Sequelize.INTEGER, defaultValue: 0 },
      compile_error:{ type: Sequelize.TEXT, allowNull: true },
      results:      { type: Sequelize.JSON, defaultValue: [] },
      waveform_vcd: { type: Sequelize.TEXT, allowNull: true },
      stdout:       { type: Sequelize.TEXT, allowNull: true },
      runtime_ms:   { type: Sequelize.INTEGER, defaultValue: 0 },
      submitted_at: { type: Sequelize.DATE, allowNull: false },
      updated_at:   { type: Sequelize.DATE, allowNull: false },
    });
    await queryInterface.addIndex('lab_submissions', ['problem_id']);
    await queryInterface.addIndex('lab_submissions', ['user_id']);
    await queryInterface.addIndex('lab_submissions', ['mode']);
    await queryInterface.addIndex('lab_submissions', ['status']);

    // verilog_problems
    await queryInterface.createTable('verilog_problems', {
      id:           { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true },
      title:        { type: Sequelize.STRING, allowNull: false },
      description:  { type: Sequelize.TEXT, allowNull: false },
      starter_code: { type: Sequelize.TEXT, allowNull: false },
      testbench:    { type: Sequelize.TEXT, allowNull: false },
      visible_test_cases: { type: Sequelize.JSON, defaultValue: [] },
      difficulty:   { type: Sequelize.ENUM('easy','medium','hard'), defaultValue: 'easy' },
      level:        { type: Sequelize.INTEGER, defaultValue: 1 },
      category:     { type: Sequelize.STRING, defaultValue: 'combinational' },
      marks:        { type: Sequelize.FLOAT, defaultValue: 10 },
      time_limit_s: { type: Sequelize.INTEGER, defaultValue: 10 },
      lang_type:    { type: Sequelize.ENUM('rtl_coding','waveform_analysis'), defaultValue: 'rtl_coding' },
      schematic_data: { type: Sequelize.JSON, defaultValue: null },
      is_active:    { type: Sequelize.BOOLEAN, defaultValue: true },
      created_by:   { type: Sequelize.UUID, allowNull: false, references: { model: 'users', key: 'id' }, onDelete: 'CASCADE' },
      subject_id:   { type: Sequelize.UUID, allowNull: true },
      topic_id:     { type: Sequelize.UUID, allowNull: true },
      created_at:   { type: Sequelize.DATE, allowNull: false },
      updated_at:   { type: Sequelize.DATE, allowNull: false },
    });
    await queryInterface.addIndex('verilog_problems', ['difficulty']);
    await queryInterface.addIndex('verilog_problems', ['level']);
    await queryInterface.addIndex('verilog_problems', ['created_by']);

    // verilog_submissions
    await queryInterface.createTable('verilog_submissions', {
      id:           { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true },
      problem_id:   { type: Sequelize.UUID, allowNull: false, references: { model: 'verilog_problems', key: 'id' }, onDelete: 'CASCADE' },
      user_id:      { type: Sequelize.UUID, allowNull: false, references: { model: 'users', key: 'id' }, onDelete: 'CASCADE' },
      source_code:  { type: Sequelize.TEXT, allowNull: false },
      mode:         { type: Sequelize.ENUM('run','submit'), defaultValue: 'run' },
      status:       { type: Sequelize.ENUM('pending','running','passed','failed','error','timeout'), defaultValue: 'pending' },
      score:        { type: Sequelize.FLOAT, defaultValue: 0 },
      passed_cases: { type: Sequelize.INTEGER, defaultValue: 0 },
      total_cases:  { type: Sequelize.INTEGER, defaultValue: 0 },
      compile_error:{ type: Sequelize.TEXT, allowNull: true },
      results:      { type: Sequelize.JSON, defaultValue: [] },
      waveform_vcd: { type: Sequelize.TEXT, allowNull: true },
      runtime_ms:   { type: Sequelize.INTEGER, defaultValue: 0 },
      submitted_at: { type: Sequelize.DATE, allowNull: false },
      updated_at:   { type: Sequelize.DATE, allowNull: false },
    });
    await queryInterface.addIndex('verilog_submissions', ['problem_id']);
    await queryInterface.addIndex('verilog_submissions', ['user_id']);
    await queryInterface.addIndex('verilog_submissions', ['status']);

    // daily_challenges
    await queryInterface.createTable('daily_challenges', {
      id:             { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true },
      problem_id:     { type: Sequelize.UUID, allowNull: false, references: { model: 'lab_problems', key: 'id' }, onDelete: 'CASCADE' },
      type:           { type: Sequelize.ENUM('systemverilog','programming'), allowNull: false },
      scheduled_date: { type: Sequelize.DATEONLY, allowNull: false, unique: true },
      title:          { type: Sequelize.STRING, allowNull: false },
      created_by:     { type: Sequelize.UUID, allowNull: false, references: { model: 'users', key: 'id' }, onDelete: 'CASCADE' },
      is_active:      { type: Sequelize.BOOLEAN, defaultValue: true },
      created_at:     { type: Sequelize.DATE, allowNull: false },
      updated_at:     { type: Sequelize.DATE, allowNull: false },
    });
    await queryInterface.addIndex('daily_challenges', ['scheduled_date']);
    await queryInterface.addIndex('daily_challenges', ['problem_id']);

    // daily_challenge_submissions
    await queryInterface.createTable('daily_challenge_submissions', {
      id:           { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true },
      challenge_id: { type: Sequelize.UUID, allowNull: false, references: { model: 'daily_challenges', key: 'id' }, onDelete: 'CASCADE' },
      user_id:      { type: Sequelize.UUID, allowNull: false, references: { model: 'users', key: 'id' }, onDelete: 'CASCADE' },
      problem_id:   { type: Sequelize.UUID, allowNull: false, references: { model: 'lab_problems', key: 'id' }, onDelete: 'CASCADE' },
      status:       { type: Sequelize.ENUM('solved','attempted'), defaultValue: 'attempted' },
      solved_at:    { type: Sequelize.DATE, allowNull: true },
      is_past:      { type: Sequelize.BOOLEAN, defaultValue: false },
      created_at:   { type: Sequelize.DATE, allowNull: false },
      updated_at:   { type: Sequelize.DATE, allowNull: false },
    });
    await queryInterface.addIndex('daily_challenge_submissions', ['challenge_id', 'user_id'], { unique: true });
    await queryInterface.addIndex('daily_challenge_submissions', ['user_id']);

    // contests
    await queryInterface.createTable('contests', {
      id:               { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true },
      title:            { type: Sequelize.STRING, allowNull: false },
      description:      { type: Sequelize.TEXT },
      start_time:       { type: Sequelize.DATE, allowNull: false },
      end_time:         { type: Sequelize.DATE, allowNull: false },
      status:           { type: Sequelize.ENUM('draft','upcoming','live','ended'), defaultValue: 'draft' },
      is_public:        { type: Sequelize.BOOLEAN, defaultValue: true },
      max_participants: { type: Sequelize.INTEGER, allowNull: true },
      rules:            { type: Sequelize.TEXT, allowNull: true },
      created_by:       { type: Sequelize.UUID, allowNull: false, references: { model: 'users', key: 'id' }, onDelete: 'CASCADE' },
      org_id:           { type: Sequelize.UUID, allowNull: true },
      created_at:       { type: Sequelize.DATE, allowNull: false },
      updated_at:       { type: Sequelize.DATE, allowNull: false },
    });
    await queryInterface.addIndex('contests', ['status']);
    await queryInterface.addIndex('contests', ['start_time']);
    await queryInterface.addIndex('contests', ['created_by']);

    // contest_problems
    await queryInterface.createTable('contest_problems', {
      id:           { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true },
      contest_id:   { type: Sequelize.UUID, allowNull: false, references: { model: 'contests', key: 'id' }, onDelete: 'CASCADE' },
      problem_id:   { type: Sequelize.UUID, allowNull: true, references: { model: 'lab_problems', key: 'id' }, onDelete: 'SET NULL' },
      question_id:  { type: Sequelize.UUID, allowNull: true, references: { model: 'questions', key: 'id' }, onDelete: 'SET NULL' },
      problem_source: { type: Sequelize.ENUM('lab','objective'), defaultValue: 'lab' },
      order_index:  { type: Sequelize.INTEGER, defaultValue: 0 },
      marks:        { type: Sequelize.FLOAT, defaultValue: 100 },
      problem_type: { type: Sequelize.ENUM('programming','database','hardware','embedded','objective'), defaultValue: 'programming' },
    });
    await queryInterface.addIndex('contest_problems', ['contest_id']);
    await queryInterface.addIndex('contest_problems', ['contest_id', 'problem_id']);
    await queryInterface.addIndex('contest_problems', ['contest_id', 'question_id']);

    // contest_registrations
    await queryInterface.createTable('contest_registrations', {
      id:            { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true },
      contest_id:    { type: Sequelize.UUID, allowNull: false, references: { model: 'contests', key: 'id' }, onDelete: 'CASCADE' },
      user_id:       { type: Sequelize.UUID, allowNull: false, references: { model: 'users', key: 'id' }, onDelete: 'CASCADE' },
      registered_at: { type: Sequelize.DATE, defaultValue: Sequelize.NOW },
    });
    await queryInterface.addIndex('contest_registrations', ['contest_id', 'user_id'], { unique: true });
    await queryInterface.addIndex('contest_registrations', ['contest_id']);
    await queryInterface.addIndex('contest_registrations', ['user_id']);

    // contest_submissions
    await queryInterface.createTable('contest_submissions', {
      id:                 { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true },
      contest_id:         { type: Sequelize.UUID, allowNull: false, references: { model: 'contests', key: 'id' }, onDelete: 'CASCADE' },
      problem_id:         { type: Sequelize.UUID, allowNull: true, references: { model: 'lab_problems', key: 'id' }, onDelete: 'SET NULL' },
      question_id:        { type: Sequelize.UUID, allowNull: true, references: { model: 'questions', key: 'id' }, onDelete: 'SET NULL' },
      user_id:            { type: Sequelize.UUID, allowNull: false, references: { model: 'users', key: 'id' }, onDelete: 'CASCADE' },
      problem_source:     { type: Sequelize.ENUM('lab','objective'), defaultValue: 'lab' },
      lab_submission_id:  { type: Sequelize.UUID, allowNull: true, references: { model: 'lab_submissions', key: 'id' }, onDelete: 'SET NULL' },
      selected_option_id: { type: Sequelize.UUID, allowNull: true },
      is_correct:         { type: Sequelize.BOOLEAN, allowNull: true },
      language:           { type: Sequelize.STRING, allowNull: true },
      status:             { type: Sequelize.ENUM('pending','running','passed','failed','error','timeout'), defaultValue: 'pending' },
      score:              { type: Sequelize.FLOAT, defaultValue: 0 },
      passed_cases:       { type: Sequelize.INTEGER, defaultValue: 0 },
      total_cases:        { type: Sequelize.INTEGER, defaultValue: 0 },
      attempt_count:      { type: Sequelize.INTEGER, defaultValue: 1 },
      submitted_at:       { type: Sequelize.DATE, defaultValue: Sequelize.NOW },
    });
    await queryInterface.addIndex('contest_submissions', ['contest_id', 'user_id']);
    await queryInterface.addIndex('contest_submissions', ['contest_id', 'problem_id', 'user_id']);
    await queryInterface.addIndex('contest_submissions', ['contest_id', 'question_id', 'user_id']);
    await queryInterface.addIndex('contest_submissions', ['user_id']);
  },

  async down(queryInterface) {
    const tables = [
      'contest_submissions','contest_registrations','contest_problems','contests',
      'daily_challenge_submissions','daily_challenges',
      'verilog_submissions','verilog_problems',
      'lab_submissions','lab_problem_groups','lab_problems','lab_groups',
    ];
    await queryInterface.sequelize.query('SET FOREIGN_KEY_CHECKS=0');
    for (const t of tables) await queryInterface.dropTable(t);
    await queryInterface.sequelize.query('SET FOREIGN_KEY_CHECKS=1');
  },
};
