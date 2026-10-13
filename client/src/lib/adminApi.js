import api from './api';

export const adminApi = {
  // Stats
  getStats: () => api.get('/admin/stats'),

  // Users
  getUsers: (params) => api.get('/admin/users', { params }),
  createUser: (data) => api.post('/admin/users', data),
  updateUser: (id, data) => api.put(`/admin/users/${id}`, data),
  setUserPermissions: (id, data) => api.patch(`/admin/users/${id}/permissions`, data),
  deleteUser: (id) => api.delete(`/admin/users/${id}`),
  resetPassword: (id, password) => api.post(`/admin/users/${id}/reset-password`, { password }),
  forceLogout: (id) => api.post(`/admin/users/${id}/force-logout`),
  suspendUser: (id) => api.post(`/admin/users/${id}/suspend`),
  unflagUser:  (id) => api.post(`/admin/users/${id}/unflag`),
  bulkImport: (rows) => api.post('/admin/users/bulk-import', { rows }),
};
