import api from './api';

export const contestApi = {
  // Student
  list:            ()         => api.get('/contests'),
  get:             (id)       => api.get(`/contests/${id}`),
  register:        (id)       => api.post(`/contests/${id}/register`),
  submit:          (id, data) => api.post(`/contests/${id}/submit`, data),
  submitObjective: (id, data) => api.post(`/contests/${id}/submit-objective`, data),
  leaderboard:     (id)       => api.get(`/contests/${id}/leaderboard`),

  // Admin
  adminList:           ()           => api.get('/contests/admin'),
  adminGet:            (id)         => api.get(`/contests/admin/${id}`),
  adminCreate:         (data)       => api.post('/contests/admin', data),
  adminUpdate:         (id, data)   => api.put(`/contests/admin/${id}`, data),
  adminDelete:         (id)         => api.delete(`/contests/admin/${id}`),
  adminAddProblem:     (id, data)   => api.post(`/contests/admin/${id}/problems`, data),
  adminAddObjective:   (id, data)   => api.post(`/contests/admin/${id}/objectives`, data),
  adminRemoveProblem:  (id, cpId)   => api.delete(`/contests/admin/${id}/problems/${cpId}`),
  adminQuestionBanks:  (id)         => api.get(`/contests/admin/${id}/question-banks`),
};
