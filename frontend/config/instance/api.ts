import axios, { AxiosInstance, InternalAxiosRequestConfig } from "axios";
import { getAccessToken, setAccessToken, clearAuthData } from "../token/token";

const api: AxiosInstance = axios.create({
  baseURL: 'http://localhost:8080/api/v1',
  withCredentials: true,
});

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
    console.log('[Request]', config.url, '| hasToken:', !!token);

    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }

    if (config.data instanceof FormData) {
      delete config.headers['Content-Type'];
    }

    return config;
  },
  (error) => Promise.reject(error)
);

/**
 * Response Interceptor with auto-refresh
 */
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config as any;

    // Debug log (remove in production)
    console.log('[Response Error]', error.response?.status, originalRequest?.url);

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