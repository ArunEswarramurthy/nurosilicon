import api from './api';

export const learnAdminApi = {
  // Stats
  getStats: () => api.get('/admin/learn/stats'),

  // Templates
  listTemplates: () => api.get('/admin/learn/templates'),
  createTemplate: (data) => api.post('/admin/learn/templates', data),
  getTemplate: (id) => api.get(`/admin/learn/templates/${id}`),
  updateTemplate: (id, data) => api.put(`/admin/learn/templates/${id}`, data),
  publishTemplate: (id) => api.post(`/admin/learn/templates/${id}/publish`),
  duplicateTemplate: (id) => api.post(`/admin/learn/templates/${id}/duplicate`),
  rollbackTemplate: (id, versionId) => api.post(`/admin/learn/templates/${id}/rollback/${versionId}`),
  archiveTemplate: (id) => api.delete(`/admin/learn/templates/${id}`),
  getTemplateVersions: (id) => api.get(`/admin/learn/templates/${id}/versions`),

  // Courses
  listCourses: (params) => api.get('/admin/learn/courses', { params }),
  createCourse: (data) => api.post('/admin/learn/courses', data, { headers: { 'Content-Type': 'multipart/form-data' } }),
  getCourse: (id) => api.get(`/admin/learn/courses/${id}`),
  updateCourse: (id, data) => api.put(`/admin/learn/courses/${id}`, data, { headers: { 'Content-Type': 'multipart/form-data' } }),
  publishCourse: (id) => api.post(`/admin/learn/courses/${id}/publish`),
  unpublishCourse: (id) => api.post(`/admin/learn/courses/${id}/unpublish`),
  archiveCourse: (id) => api.post(`/admin/learn/courses/${id}/archive`),
  duplicateCourse: (id) => api.post(`/admin/learn/courses/${id}/duplicate`),
  getCourseAnalytics: (id) => api.get(`/admin/learn/courses/${id}/analytics`),

  // Curriculum
  listModules: (courseId) => api.get(`/admin/learn/courses/${courseId}/modules`),
  createModule: (courseId, data) => api.post(`/admin/learn/courses/${courseId}/modules`, data),
  updateModule: (courseId, moduleId, data) => api.put(`/admin/learn/courses/${courseId}/modules/${moduleId}`, data),
  deleteModule: (courseId, moduleId) => api.delete(`/admin/learn/courses/${courseId}/modules/${moduleId}`),

  createTopic: (courseId, moduleId, data) => api.post(`/admin/learn/courses/${courseId}/modules/${moduleId}/topics`, data),
  updateTopic: (courseId, topicId, data) => api.put(`/admin/learn/courses/${courseId}/topics/${topicId}`, data),
  deleteTopic: (courseId, topicId) => api.delete(`/admin/learn/courses/${courseId}/topics/${topicId}`),

  createLesson: (courseId, topicId, data) => api.post(`/admin/learn/courses/${courseId}/topics/${topicId}/lessons`, data),
  getLesson: (courseId, lessonId) => api.get(`/admin/learn/courses/${courseId}/lessons/${lessonId}`),
  updateLesson: (courseId, lessonId, data) => api.put(`/admin/learn/courses/${courseId}/lessons/${lessonId}`, data),
  deleteLesson: (courseId, lessonId) => api.delete(`/admin/learn/courses/${courseId}/lessons/${lessonId}`),
  reorder: (courseId, data) => api.post(`/admin/learn/courses/${courseId}/reorder`, data),
  publishAll: (courseId) => api.post(`/admin/learn/courses/${courseId}/publish-all`),
  uploadLessonImage: (file) => {
    const fd = new FormData();
    fd.append('image', file);
    return api.post('/admin/learn/upload/lesson-image', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
  },

  // Quizzes
  listQuizzes: (courseId) => api.get(`/admin/learn/courses/${courseId}/quizzes`),
  createQuiz: (courseId, data) => api.post(`/admin/learn/courses/${courseId}/quizzes`, data),
  updateQuiz: (courseId, quizId, data) => api.put(`/admin/learn/courses/${courseId}/quizzes/${quizId}`, data),
  addQuestion: (courseId, quizId, data) => api.post(`/admin/learn/courses/${courseId}/quizzes/${quizId}/questions`, data),
  deleteQuestion: (courseId, quizId, questionId) => api.delete(`/admin/learn/courses/${courseId}/quizzes/${quizId}/questions/${questionId}`),
};

export const learnStudentApi = {
  getCatalogue: (params) => api.get('/learn/courses', { params }),
  getCourse: (slug) => api.get(`/learn/courses/${slug}`),
  enroll: (slug) => api.post(`/learn/courses/${slug}/enroll`),
  getLesson: (slug, lessonId) => api.get(`/learn/courses/${slug}/lesson/${lessonId}`),
  completeLesson: (slug, lessonId) => api.post(`/learn/courses/${slug}/lesson/${lessonId}/complete`),
  getMyLearning: () => api.get('/learn/my-learning'),

  getQuiz: (quizId) => api.get(`/learn/quiz/${quizId}`),
  startAttempt: (quizId) => api.post(`/learn/quiz/${quizId}/start`),
  submitAttempt: (quizId, data) => api.post(`/learn/quiz/${quizId}/submit`, data),
  getQuizHistory: (quizId) => api.get(`/learn/quiz/${quizId}/history`),

  getNotes: (lessonId) => api.get(`/learn/lessons/${lessonId}/notes`),
  saveNote: (lessonId, content) => api.post(`/learn/lessons/${lessonId}/notes`, { content }),
  updateNote: (noteId, content) => api.put(`/learn/notes/${noteId}`, { content }),
  deleteNote: (noteId) => api.delete(`/learn/notes/${noteId}`),

  getBookmarks: () => api.get('/learn/bookmarks'),
  toggleBookmark: (lessonId) => api.post(`/learn/lessons/${lessonId}/bookmark`),

  getCertificates: () => api.get('/learn/certificates'),
  issueCertificate: (courseId) => api.post(`/learn/courses/${courseId}/certificate`),
  verifyCertificate: (certId) => api.get(`/learn/certificates/verify/${certId}`),

  getTemplateConfig: (templateId) => api.get(`/learn/templates/${templateId}/effective`),
};
