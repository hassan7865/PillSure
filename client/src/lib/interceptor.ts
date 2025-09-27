import axios from 'axios';

// Create axios instance
const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api',
  timeout: 10000,
});

// Request interceptor
api.interceptors.request.use(
  (config) => {
    // Add auth token to requests
    const token = localStorage.getItem('authToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor
api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    // Handle 401 errors (unauthorized)
    if (error.response?.status === 401) {
      // Clear auth data
      localStorage.removeItem('authToken');
      localStorage.removeItem('user');
      
      // Redirect to login if not already there
      if (typeof window !== 'undefined' && !window.location.pathname.includes('/auth')) {
        window.location.href = '/auth';
      }
    }
    
    return Promise.reject(error);
  }
);

export default api;
