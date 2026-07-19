import api from './axios';

export const adminApi = {
  // Institution
  getInstitution: () => api.get('/admin/institution'),
  updateInstitution: (data) => api.patch('/admin/institution', data),

  // Departments
  getDepartments: (params) => api.get('/admin/departments', { params }),
  createDepartment: (data) => api.post('/admin/departments', data),
  updateDepartment: (id, data) => api.patch(`/admin/departments/${id}`, data),
  deleteDepartment: (id) => api.delete(`/admin/departments/${id}`),

  // Courses
  getCourses: (params) => api.get('/admin/courses', { params }),
  createCourse: (data) => api.post('/admin/courses', data),
  updateCourse: (id, data) => api.patch(`/admin/courses/${id}`, data),
  enrollStudent: (data) => api.post('/admin/courses/enroll', data),

  // Users
  getUsers: (params) => api.get('/admin/users', { params }),
  createUser: (data) => api.post('/admin/users', data),
  updateUser: (id, data) => api.patch(`/admin/users/${id}`, data),
  resetUserPassword: (id, newPassword) => api.post(`/admin/users/${id}/reset-password`, { newPassword }),

  // Analytics & Audit
  getAnalytics: () => api.get('/admin/analytics'),
  getAuditLogs: (params) => api.get('/admin/audit-logs', { params }),
};
