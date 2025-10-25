import http from './http';

export const listFiles = () => http.get('/files');
export const getFile = (id) => http.get(`/files/${id}`);
export const createFile = (payload) => http.post('/files', payload);
export const uploadFile = (formData) => http.post('/files/upload', formData, {
  headers: {
    'Content-Type': 'multipart/form-data'
  }
});
