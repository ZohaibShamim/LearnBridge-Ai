import axios, { AxiosInstance, InternalAxiosRequestConfig } from "axios";
import { getAccessToken, setAccessToken, clearAuthData } from "../token/token";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000/api/v1';

const api: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
});

export { API_BASE_URL };

// Auth endpoints that should NOT trigger token refresh on 401
const AUTH_ENDPOINTS = [
  '/users/login',
  '/users/register',
  '/users/verify-otp',
  '/users/resend-otp',
  '/users/refresh-token',
];

const isAuthEndpoint = (url: string | undefined): boolean => {
  if (!url) return false;
  return AUTH_ENDPOINTS.some(endpoint => url.includes(endpoint));
};

let isRefreshing = false;
let failedQueue: Array<{
  onSuccess: (token: string) => void;
  onFailed: (error: any) => void;
}> = [];

const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.onFailed(error);
    } else {
      prom.onSuccess(token || "");
    }
  });
  isRefreshing = false;
  failedQueue = [];
};

/**
 * Request Interceptor
 */
api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = getAccessToken();

    // Debug log (remove in production)
    console.log('[API Request]', config.url, '| Method:', config.method, '| hasToken:', !!token);

    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }

    if (config.data instanceof FormData) {
      delete config.headers['Content-Type'];
    }

    return config;
  },
  (error) => {
    console.error('[API Request Error]', error);
    return Promise.reject(error);
  }
);

/**
 * Response Interceptor with auto-refresh
 */
api.interceptors.response.use(
  (response) => {
    console.log('[API Response]', response.config.url, '| Status:', response.status);
    return response;
  },
  async (error) => {
    const originalRequest = error.config as any;

    // Debug log (remove in production)
    console.log('[API Response Error]', error.response?.status, originalRequest?.url, error.message);

    // Don't try to refresh for auth endpoints - just return the error
    if (isAuthEndpoint(originalRequest?.url)) {
      console.log('[Auth Endpoint Error] Not attempting refresh for:', originalRequest?.url);
      return Promise.reject(error);
    }

    // Don't try to refresh if the failing request IS the refresh endpoint
    if (originalRequest?.url?.includes('/users/refresh-token')) {
      console.log('[Refresh Failed] Redirecting to login...');
      clearAuthData();
      if (typeof window !== 'undefined') {
        window.location.href = '/login';
      }
      return Promise.reject(error);
    }

    // Handle 401 - try to refresh token
    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        // Queue this request while refresh is in progress
        return new Promise((resolve, reject) => {
          failedQueue.push({
            onSuccess: (token: string) => {
              originalRequest.headers['Authorization'] = `Bearer ${token}`;
              resolve(api(originalRequest));
            },
            onFailed: (err) => reject(err),
          });
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        console.log('[Refreshing Token]...');

        // Call refresh endpoint - NO Authorization header needed
        // Only the HTTP-only cookie (refreshToken) is sent automatically
        const response = await axios.post(
          `${api.defaults.baseURL}/users/refresh-token`,
          {},
          {
            withCredentials: true, // Send cookies
            headers: {
              'Content-Type': 'application/json',
              // DO NOT send Authorization header here
            },
          }
        );

        const newAccessToken = response.data?.data?.accessToken;

        if (!newAccessToken) {
          throw new Error('No access token in refresh response');
        }

        console.log('[Token Refreshed] Successfully got new access token');

        setAccessToken(newAccessToken);
        originalRequest.headers['Authorization'] = `Bearer ${newAccessToken}`;

        processQueue(null, newAccessToken);
        return api(originalRequest);
      } catch (err: any) {
        console.log('[Refresh Failed]', err?.response?.data?.message || err.message);
        processQueue(err, null);
        clearAuthData();

        if (typeof window !== 'undefined') {
          window.location.href = '/login';
        }

        return Promise.reject(err);
      }
    }

    return Promise.reject(error);
  }
);

export default api;