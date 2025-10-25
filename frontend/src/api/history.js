import http from './http';

export const fetchHistory = (params = {}) => http.get('/history', { params });
