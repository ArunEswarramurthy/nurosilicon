import api from './api';

export const verilogApi = {
  list:           (params) => api.get('/verilog/problems', { params }),
  get:            (id) => api.get(`/verilog/problems/${id}`),
  getFull:        (id) => api.get(`/verilog/problems/${id}/full`),
  create:         (data) => api.post('/verilog/problems', data),
  update:         (id, data) => api.put(`/verilog/problems/${id}`, data),
  remove:         (id) => api.delete(`/verilog/problems/${id}`),
  run:            (id, source_code) => api.post(`/verilog/problems/${id}/run`, { source_code }),
  submit:         (id, source_code) => api.post(`/verilog/problems/${id}/submit`, { source_code }),
  analyze:        (id, source_code) => api.post(`/verilog/problems/${id}/analyze`, { source_code }),
  getSubmission:  (id) => api.get(`/verilog/submissions/${id}`),
  mySubmissions:  (id) => api.get(`/verilog/problems/${id}/my-submissions`),
  getSchematic:   (id) => api.get(`/verilog/problems/${id}/schematic`),
  saveSchematic:  (id, schematic) => api.put(`/verilog/problems/${id}/schematic`, { schematic }),
};

export const labApi = {
  list:          (params) => api.get('/lab/problems', { params }),
  groups:        () => api.get('/lab/groups'),
  createGroup:   (data) => api.post('/lab/groups', data),
  updateGroup:   (id, data) => api.put(`/lab/groups/${id}`, data),
  removeGroup:   (id) => api.delete(`/lab/groups/${id}`),
  assignGroup:   (id, data) => api.post(`/lab/groups/${id}/assign`, data),
  get:           (id) => api.get(`/lab/problems/${id}`),
  getFull:       (id) => api.get(`/lab/problems/${id}/full`),
  create:        (data) => api.post('/lab/problems', data),
  update:        (id, data) => api.put(`/lab/problems/${id}`, data),
  remove:        (id) => api.delete(`/lab/problems/${id}`),
  run:           (id, source_code, chosen_language) => api.post(`/lab/problems/${id}/run`, { source_code, chosen_language }),
  submit:        (id, source_code, chosen_language) => api.post(`/lab/problems/${id}/submit`, { source_code, chosen_language }),
  runFree:       (language, source_code, stdin) => api.post('/lab/run-free', { language, source_code, stdin }),
  getSubmission: (id) => api.get(`/lab/submissions/${id}`),
  mySubmissions: (id) => api.get(`/lab/problems/${id}/my-submissions`),
  health:        () => api.get('/lab/health'),
  // Daily Challenge
  dcToday:       () => api.get('/daily-challenge/today'),
  dcPast:        () => api.get('/daily-challenge/past'),
  dcMarkSolved:  (id) => api.post(`/daily-challenge/${id}/mark-solved`),
  // Admin Daily Challenge
  dcAdminList:   () => api.get('/daily-challenge/admin'),
  dcAdminCreate: (data) => api.post('/daily-challenge/admin', data),
  dcAdminDelete: (id) => api.delete(`/daily-challenge/admin/${id}`),
};
