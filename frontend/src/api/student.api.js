import api from './axios';

export const studentApi = {
  getMyCourses: () => api.get('/student/courses'),
  markAttendance: (data) => api.post('/student/attendance/mark', data),
  getMyAttendance: (params) => api.get('/student/attendance', { params }),
  getAnalytics: () => api.get('/student/analytics'),
};

export const notificationApi = {
  getNotifications: (params) => api.get('/notifications', { params }),
  markAsRead: (id) => api.patch(`/notifications/${id}/read`),
  markAllAsRead: () => api.patch('/notifications/read-all'),
  deleteNotification: (id) => api.delete(`/notifications/${id}`),
};
