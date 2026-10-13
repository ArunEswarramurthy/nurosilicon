'use strict';

const { AuditLog, Question, QuestionBank, User } = require('../models');
const bankController = require('../controllers/engLabBankController');

const response = () => ({
  status: jest.fn().mockReturnThis(),
  json: jest.fn(),
});

const modelQuestion = (data) => ({ id: data.id, toJSON: () => data });

describe('engineering lab objective-bank API', () => {
  afterEach(() => jest.restoreAllMocks());

  test('student bank reads omit answer keys and require a published objective bank', async () => {
    const bank = {
      id: 'bank-1',
      toJSON: () => ({ id: 'bank-1', name: 'Practice bank' }),
    };
    jest.spyOn(QuestionBank, 'findOne').mockResolvedValue(bank);
    const findQuestions = jest.spyOn(Question, 'findAll').mockResolvedValue([
      modelQuestion({
        id: 'question-1',
        type: 'mcq_single',
        title: 'Pick one',
        difficulty: 'easy',
        marks: 1,
        explanation: 'Not before submission',
        options: [{ id: 'option-1', option_text: 'First', is_correct: true, order_index: 0 }],
      }),
    ]);
    const res = response();

    await bankController.getBank({ params: { id: 'bank-1' }, user: { role: 'student' } }, res);

    expect(QuestionBank.findOne).toHaveBeenCalledWith({
      where: { id: 'bank-1', category: 'engineering_lab_objective', is_archived: false, status: 'published' },
      include: [{ model: User, as: 'creator', attributes: ['id', 'name'] }],
    });
    expect(findQuestions.mock.calls[0][0].include).toEqual([
      expect.objectContaining({ as: 'options', attributes: ['id', 'option_text', 'order_index'] }),
    ]);
    const payload = res.json.mock.calls[0][0];
    expect(payload.questions[0].options).toEqual([{ id: 'option-1', option_text: 'First', order_index: 0 }]);
    expect(JSON.stringify(payload)).not.toMatch(/is_correct|explanation/);
  });

  test('student question type filters cannot request unsupported question types', async () => {
    jest.spyOn(QuestionBank, 'findOne').mockResolvedValue({ id: 'bank-1' });
    const findQuestions = jest.spyOn(Question, 'findAll');
    const res = response();

    await bankController.listQuestions({
      params: { id: 'bank-1' },
      query: { type: 'coding' },
      user: { role: 'student' },
    }, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ message: 'Unsupported objective question type' });
    expect(findQuestions).not.toHaveBeenCalled();
  });

  test('rejects client-provided scores instead of trusting them', async () => {
    const findBank = jest.spyOn(QuestionBank, 'findOne');
    const res = response();

    await bankController.submitAttempt({
      params: { id: 'bank-1' },
      user: { id: 'student-1', role: 'student' },
      body: { question_ids: ['question-1'], answers: {}, score: 999 },
    }, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ message: 'Unsupported attempt field: score' });
    expect(findBank).not.toHaveBeenCalled();
  });

  test('grades submitted answers and persists a server-calculated score', async () => {
    const bank = { id: 'bank-1' };
    jest.spyOn(QuestionBank, 'findOne').mockResolvedValue(bank);
    jest.spyOn(Question, 'findAll').mockResolvedValue([
      modelQuestion({
        id: 'question-1',
        type: 'mcq_single',
        marks: 2,
        explanation: 'Explanation after submission',
        options: [
          { id: 'option-a', option_text: 'A', is_correct: true, order_index: 0 },
          { id: 'option-b', option_text: 'B', is_correct: false, order_index: 1 },
        ],
      }),
      modelQuestion({
        id: 'question-2',
        type: 'fill_blank',
        marks: 3,
        options: [{ id: 'answer', option_text: 'Ohm', is_correct: false, order_index: 0 }],
      }),
    ]);
    const auditCreate = jest.spyOn(AuditLog, 'create').mockResolvedValue({ id: 'attempt-1' });
    const res = response();

    await bankController.submitAttempt({
      params: { id: 'bank-1' },
      user: { id: 'student-1', role: 'student' },
      body: {
        question_ids: ['question-1', 'question-2'],
        answers: { 'question-1': 'option-a', 'question-2': ' volt ' },
        elapsed_seconds: 42,
      },
    }, res);

    expect(res.status).toHaveBeenCalledWith(201);
    expect(auditCreate).toHaveBeenCalledWith({
      user_id: 'student-1',
      action: 'OBJ_BANK_ATTEMPT',
      module: 'question_bank',
      target_id: 'bank-1',
      metadata: {
        score: 2,
        max_score: 5,
        correct_count: 1,
        total_questions: 2,
        elapsed_seconds: 42,
      },
    });
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      attempt_id: 'attempt-1',
      score: 2,
      max_score: 5,
      score_percent: 40,
      correct_count: 1,
      total_questions: 2,
    }));
  });
});
