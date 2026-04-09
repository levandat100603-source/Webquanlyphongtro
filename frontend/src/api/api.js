import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://127.0.0.1:8000/api';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
  withCredentials: false,
});

// Add token to requests
api.interceptors.request.use(
  (config) => {
    if (typeof FormData !== 'undefined' && config.data instanceof FormData) {
      if (config.headers?.delete) {
        config.headers.delete('Content-Type');
      } else if (config.headers) {
        delete config.headers['Content-Type'];
        delete config.headers['content-type'];
      }
    }

    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Handle response errors
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const status = error.response?.status;
    const config = error.config || {};

    if (
      config &&
      !config.__retryOnGatewayError &&
      (!config.method || String(config.method).toLowerCase() === 'get') &&
      [502, 503, 504].includes(status)
    ) {
      config.__retryOnGatewayError = true;
      await new Promise((resolve) => setTimeout(resolve, 700));
      return api.request(config);
    }

    if (status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      // App uses HashRouter, so force hash-based login URL to avoid Vercel 404 on hard redirect.
      window.location.assign(`${window.location.origin}/#/login`);
    }
    return Promise.reject(error);
  }
);

export default api;
