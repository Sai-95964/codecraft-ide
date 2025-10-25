import axios from 'axios';

const rawBase = process.env.REACT_APP_API_URL || 'http://localhost:5000';
const normalizedBase = rawBase.endsWith('/') ? rawBase.slice(0, -1) : rawBase;

const http = axios.create({
  baseURL: `${normalizedBase}/api`,
  timeout: 60000,
  headers: {
    'Content-Type': 'application/json'
  }
});

function getToken() {
  if (typeof window === 'undefined') return null;
  try {
    return window.localStorage.getItem('cc_token');
  } catch (err) {
    return null;
  }
}

http.interceptors.request.use((config) => {
  const token = getToken();
  if (token) {
    config.headers = config.headers || {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

http.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error?.response?.status === 401 && typeof window !== 'undefined') {
      try {
        window.localStorage.removeItem('cc_token');
        window.localStorage.removeItem('cc_user');
        window.dispatchEvent(new Event('cc-auth-logout'));
      } catch (err) {
        // ignore storage errors
      }
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default http;
