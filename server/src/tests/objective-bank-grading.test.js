'use strict';

const { sanitizeObjectiveQuestion, gradeObjectiveQuestion } = require('../utils/objectiveBankGrading');

const question = (overrides = {}) => ({
  id: 'question-1',
  type: 'mcq_single',
  title: 'Choose the correct answer',
  body: null,
  difficulty: 'easy',
  marks: 2,
  explanation: 'This is shown after the attempt.',
  testbench: 'private-testbench',
  options: [
    { id: 'option-a', option_text: 'A', is_correct: true, order_index: 0 },
    { id: 'option-b', option_text: 'B', is_correct: false, order_index: 1 },
  ],
  ...overrides,
});

describe('objective bank grading contracts', () => {
  test('student question projection does not disclose keys or explanations', () => {
    const publicQuestion = sanitizeObjectiveQuestion(question());

    expect(publicQuestion).toEqual({
      id: 'question-1',
      type: 'mcq_single',
      title: 'Choose the correct answer',
      body: null,
      difficulty: 'easy',
      marks: 2,
      options: [
        { id: 'option-a', option_text: 'A', order_index: 0 },
        { id: 'option-b', option_text: 'B', order_index: 1 },
      ],
    });
    expect(JSON.stringify(publicQuestion)).not.toMatch(/is_correct|explanation|testbench/);
  });

  test('grades single-choice and true/false answers on the server', () => {
    expect(gradeObjectiveQuestion(question(), 'option-a').correct).toBe(true);
    expect(gradeObjectiveQuestion(question(), 'option-b').correct).toBe(false);
    expect(gradeObjectiveQuestion(question({ type: 'true_false' }), 'option-a').correct).toBe(true);
  });

  test('grades exact multi-choice sets and normalized fill-blank text', () => {
    const multi = question({
      type: 'mcq_multi',
      options: [
        { id: 'option-a', option_text: 'A', is_correct: true, order_index: 0 },
        { id: 'option-b', option_text: 'B', is_correct: true, order_index: 1 },
        { id: 'option-c', option_text: 'C', is_correct: false, order_index: 2 },
      ],
    });
    expect(gradeObjectiveQuestion(multi, ['option-a', 'option-b']).correct).toBe(true);
    expect(gradeObjectiveQuestion(multi, ['option-a', 'option-c']).correct).toBe(false);

    const fillBlank = question({ type: 'fill_blank', options: [{ id: 'answer', option_text: 'Ohm', is_correct: false, order_index: 0 }] });
    expect(gradeObjectiveQuestion(fillBlank, '  OHM ').correct).toBe(true);
    expect(gradeObjectiveQuestion(fillBlank, 'volt').correct).toBe(false);
  });

  test('rejects malformed correct-answer configuration', () => {
    expect(() => gradeObjectiveQuestion(question({ options: [] }), 'option-a'))
      .toThrow(/invalid correct-option configuration/);
    expect(() => gradeObjectiveQuestion(question({ type: 'coding' }), ''))
      .toThrow(/Unsupported objective question type/);
  });
});
