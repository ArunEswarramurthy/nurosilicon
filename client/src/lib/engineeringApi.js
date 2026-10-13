import api from './api';

// Branches
export const getBranches    = ()         => api.get('/engineering/branches');
export const createBranch   = (data)     => api.post('/engineering/branches', data);
export const updateBranch   = (id, data) => api.put(`/engineering/branches/${id}`, data);
export const deleteBranch   = (id)       => api.delete(`/engineering/branches/${id}`);

// Subjects
export const getSubjects    = (branch_id) => api.get('/engineering/subjects', { params: { branch_id } });
export const createSubject  = (data)      => api.post('/engineering/subjects', data);
export const updateSubject  = (id, data)  => api.put(`/engineering/subjects/${id}`, data);
export const deleteSubject  = (id)        => api.delete(`/engineering/subjects/${id}`);

// Topics
export const getTopics      = (subject_id) => api.get('/engineering/topics', { params: { subject_id } });
export const createTopic    = (data)       => api.post('/engineering/topics', data);
export const updateTopic    = (id, data)   => api.put(`/engineering/topics/${id}`, data);
export const deleteTopic    = (id)         => api.delete(`/engineering/topics/${id}`);

// Full tree
export const getTree        = ()           => api.get('/engineering/tree');

// Seed defaults
export const seedDefaults   = ()           => api.post('/engineering/seed');
// -- Engineering Lab Objective Banks ------------------------------------------
export const engLabBankApi = {
  list:           (params)           => api.get('/engineering/lab-banks', { params }),
  get:            (id)               => api.get(`/engineering/lab-banks/${id}`),
  create:         (data)             => api.post('/engineering/lab-banks', data),
  update:         (id, data)         => api.put(`/engineering/lab-banks/${id}`, data),
  remove:         (id)               => api.delete(`/engineering/lab-banks/${id}`),
  submitAttempt:  (id, data)         => api.post(`/engineering/lab-banks/${id}/submit`, data),
  getQuestions:   (id, params)       => api.get(`/engineering/lab-banks/${id}/questions`, { params }),
  addQuestion:    (id, data)         => api.post(`/engineering/lab-banks/${id}/questions`, data),
  updateQuestion: (bankId, qId, data)=> api.put(`/engineering/lab-banks/${bankId}/questions/${qId}`, data),
  deleteQuestion: (bankId, qId)      => api.delete(`/engineering/lab-banks/${bankId}/questions/${qId}`),
  seedDemo:        ()                 => api.post('/engineering/lab-banks/seed'),
};
// -- Engineering Lab Folders ------------------------------------------
export const engLabFolderApi = {
  list:         ()              => api.get('/engineering/lab-folders'),
  get:          (id)            => api.get(`/engineering/lab-folders/${id}`),
  create:       (data)          => api.post('/engineering/lab-folders', data),
  update:       (id, data)      => api.put(`/engineering/lab-folders/${id}`, data),
  remove:       (id)            => api.delete(`/engineering/lab-folders/${id}`),
  assignBank:   (id, bank_id)   => api.post(`/engineering/lab-folders/${id}/assign`, { bank_id }),
  removeBank:   (id, bankId)    => api.delete(`/engineering/lab-folders/${id}/banks/${bankId}`),
};
