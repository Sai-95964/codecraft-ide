import http from './http';

export const requestAiHelp = (data) => http.post('/ai', data);
