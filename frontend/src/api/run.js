import http from './http';

export const runCode = (data) => http.post('/run', data);
