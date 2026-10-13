import api from './api';

export const studentApi = {
  // Dashboard
  getDashboard: () => api.get('/student/dashboard'),

  // Profile
  getProfile:    () => api.get('/student/profile'),
  updateProfile: (data) => api.put('/student/profile', data),
  uploadPhoto:   (file) => {
    const form = new FormData();
    form.append('photo', file);
    return api.post('/student/profile/photo', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  generateSlug: () => api.post('/student/profile/generate-slug'),

  // Notifications
  getNotifications:      () => api.get('/student/notifications'),
  markNotificationsRead: (ids) => api.put('/student/notifications/read', { ids }),
};
