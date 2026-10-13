'use strict';

const OBJECTIVE_TYPES = new Set(['mcq_single', 'mcq_multi', 'true_false', 'fill_blank']);

const toPlainQuestion = (question) => (typeof question?.toJSON === 'function' ? question.toJSON() : question);

const sanitizeObjectiveQuestion = (question) => {
  const plain = toPlainQuestion(question);
  return {
    id: plain.id,
    type: plain.type,
    title: plain.title,
    body: plain.body,
    difficulty: plain.difficulty,
    marks: plain.marks,
    options: (plain.options || [])
      .map(({ id, option_text, order_index }) => ({ id, option_text, order_index }))
      .sort((a, b) => a.order_index - b.order_index),
  };
};

const gradeObjectiveQuestion = (question, answer) => {
  const plain = toPlainQuestion(question);
  if (!OBJECTIVE_TYPES.has(plain.type)) {
    throw new Error(`Unsupported objective question type: ${plain.type}`);
  }

  const options = plain.options || [];
  const correctOptions = options.filter((option) => option.is_correct === true);
  if (plain.type === 'fill_blank') {
    const correctAnswer = (options[0]?.option_text || '').trim().toLowerCase();
    if (!correctAnswer) throw new Error(`Fill-in-the-blank question ${plain.id} has no answer`);
    const submitted = typeof answer === 'string' ? answer.trim().toLowerCase() : '';
    return { correct: submitted === correctAnswer, correct_option_ids: [], correct_answer_text: options[0].option_text };
  }

  if (!correctOptions.length || (plain.type !== 'mcq_multi' && correctOptions.length !== 1)) {
    throw new Error(`Question ${plain.id} has an invalid correct-option configuration`);
  }

  const correctIds = correctOptions.map((option) => option.id);
  let correct = false;
  if (plain.type === 'mcq_multi') {
    const selected = Array.isArray(answer) ? [...new Set(answer)] : [];
    correct = selected.length === correctIds.length && correctIds.every((id) => selected.includes(id));
  } else {
    correct = typeof answer === 'string' && correctIds[0] === answer;
  }

  return {
    correct,
    correct_option_ids: correctIds,
    correct_answer_text: correctOptions[0].option_text,
  };
};

module.exports = { OBJECTIVE_TYPES, sanitizeObjectiveQuestion, gradeObjectiveQuestion };
