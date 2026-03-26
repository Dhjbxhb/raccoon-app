import axios from 'axios';
import { TOKEN_KEY, isTokenValid } from '@/utils/auth';

const API_URL = process.env.REACT_APP_BACKEND_URL + '/api';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json'
  },
  timeout: 30000 // 30 second timeout
});

// Request interceptor - Add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem(TOKEN_KEY);
    if (token && isTokenValid(token)) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor - Handle auth errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Handle 401 Unauthorized
    if (error.response?.status === 401) {
      localStorage.removeItem(TOKEN_KEY);
      // Only redirect if not already on auth pages
      if (!window.location.pathname.match(/^\/(login|signup|guest)?$/)) {
        window.location.href = '/login';
      }
    }
    
    // Handle 403 Forbidden (banned users)
    if (error.response?.status === 403) {
      localStorage.removeItem(TOKEN_KEY);
      window.location.href = '/login';
    }
    
    return Promise.reject(error);
  }
);

export default api;
