// Shared question type definitions - single source of truth for all pages

export const QUESTION_TYPES = [
  { value: 'mcq_single',        label: 'MCQ - Single Select',  group: 'Objective',    icon: '🔘' },
  { value: 'mcq_multi',         label: 'MCQ - Multi Select',   group: 'Objective',    icon: '☑️' },
  { value: 'true_false',        label: 'True / False',         group: 'Objective',    icon: '✅' },
  { value: 'fill_blank',        label: 'Fill in the Blank',    group: 'Objective',    icon: '📝' },
  { value: 'coding',            label: 'Coding',               group: 'Programming',  icon: '💻' },
  { value: 'sql',               label: 'SQL / MySQL',          group: 'Database',     icon: '🗄️' },
  { value: 'waveform_analysis', label: 'SystemVerilog',        group: 'Hardware',     icon: '🔌' },
  { value: 'design_challenge',  label: 'Embedded C',           group: 'Embedded',     icon: '🔧' },
  { value: 'frontend',          label: 'Frontend Lab',         group: 'Web',          icon: '🌐' },
  { value: 'backend',           label: 'Backend Lab',          group: 'Web',          icon: '⚙️' },
];

export const TYPE_GROUPS = ['Objective', 'Programming', 'Database', 'Hardware', 'Embedded', 'Web'];

export function getTypeLabel(value) {
  return QUESTION_TYPES.find((t) => t.value === value)?.label || value;
}

export function getTypeIcon(value) {
  return QUESTION_TYPES.find((t) => t.value === value)?.icon || '❓';
}

export const DIFFICULTIES = ['easy', 'medium', 'hard'];

export const DIFF_COLORS = {
  easy:   'border-green-300 bg-green-50 text-green-700',
  medium: 'border-yellow-300 bg-yellow-50 text-yellow-700',
  hard:   'border-red-300 bg-red-50 text-red-700',
};

export const DIFF_BADGES = {
  easy:   'bg-green-50 text-green-700 border-green-200',
  medium: 'bg-yellow-50 text-yellow-700 border-yellow-200',
  hard:   'bg-red-50 text-red-700 border-red-200',
};

export const BANK_TYPE_COLORS = {
  mixed:            'bg-purple-50 text-purple-700 border-purple-200',
  mcq_single:       'bg-blue-50 text-blue-700 border-blue-200',
  mcq_multi:        'bg-cyan-50 text-cyan-700 border-cyan-200',
  true_false:       'bg-teal-50 text-teal-700 border-teal-200',
  fill_blank:       'bg-indigo-50 text-indigo-700 border-indigo-200',
  coding:           'bg-orange-50 text-orange-700 border-orange-200',
  sql:              'bg-yellow-50 text-yellow-700 border-yellow-200',
  waveform_analysis:'bg-violet-50 text-violet-700 border-violet-200',
  design_challenge: 'bg-green-50 text-green-700 border-green-200',
  frontend:         'bg-pink-50 text-pink-700 border-pink-200',
  backend:          'bg-red-50 text-red-700 border-red-200',
};
