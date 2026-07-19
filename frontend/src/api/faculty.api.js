import api from './axios';

export const facultyApi = {
  // Courses
  getMyCourses: () => api.get('/faculty/courses'),

  // Sessions
  getSessions: (params) => api.get('/faculty/sessions', { params }),
  getSessionById: (id) => api.get(`/faculty/sessions/${id}`),
  createSession: (data) => api.post('/faculty/sessions', data),
  startSession: (id) => api.patch(`/faculty/sessions/${id}/start`),
  endSession: (id) => api.patch(`/faculty/sessions/${id}/end`),
  cancelSession: (id) => api.patch(`/faculty/sessions/${id}/cancel`),
  getSessionQr: (id) => api.get(`/faculty/sessions/${id}/qr`),
  getSessionAttendance: (id) => api.get(`/faculty/sessions/${id}/attendance`),
  overrideAttendance: (sessionId, data) =>
    api.patch(`/faculty/sessions/${sessionId}/attendance/override`, data),

  // Export
  exportPdf: (sessionId) =>
    api.get(`/faculty/sessions/${sessionId}/export/pdf`, { responseType: 'blob' }),
  exportExcel: (sessionId) =>
    api.get(`/faculty/sessions/${sessionId}/export/excel`, { responseType: 'blob' }),

  // Analytics
  getAnalytics: (params) => api.get('/faculty/analytics', { params }),
};
