import axios from "axios";
import { getAccessToken, setAccessToken, clearAccessToken } from "./tokenStore";

const baseURL = import.meta.env.VITE_API_BASE_URL || "/api";

const api = axios.create({
  baseURL,
  // کوکی httpOnly حاوی refresh token را همراه هر درخواست ارسال می‌کند
  withCredentials: true,
  timeout: 15_000,
});

// درخواست: افزودن خودکار Authorization header
api.interceptors.request.use((config) => {
  const token = getAccessToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// صفی برای جلوگیری از ارسال چند درخواست refresh هم‌زمان
let refreshPromise = null;

async function refreshAccessToken() {
  if (!refreshPromise) {
    refreshPromise = axios
      .post(`${baseURL}/auth/refresh`, null, { withCredentials: true })
      .then((res) => {
        const newToken = res.data?.accessToken;
        setAccessToken(newToken);
        return newToken;
      })
      .finally(() => {
        refreshPromise = null;
      });
  }
  return refreshPromise;
}

// پاسخ: در صورت انقضای توکن (401)، یک بار تلاش برای تمدید خودکار می‌کنیم
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    const status = error.response?.status;

    if (status === 401 && !originalRequest._retry && !originalRequest.url?.includes("/auth/")) {
      originalRequest._retry = true;
      try {
        const newToken = await refreshAccessToken();
        if (newToken) {
          originalRequest.headers.Authorization = `Bearer ${newToken}`;
          return api(originalRequest);
        }
      } catch {
        clearAccessToken();
        window.dispatchEvent(new CustomEvent("auth:session-expired"));
      }
    }

    const message =
      error.response?.data?.message ||
      (status === 0 || !error.response
        ? "ارتباط با سرور برقرار نشد. اتصال اینترنت را بررسی کنید."
        : "خطایی غیرمنتظره رخ داد.");

    return Promise.reject({ ...error, message });
  },
);

export default api;
