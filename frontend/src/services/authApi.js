import api from "./axios";
import { setAccessToken, clearAccessToken } from "./tokenStore";

export async function loginRequest(credentials) {
  const { data } = await api.post("/auth/login", credentials);
  setAccessToken(data.accessToken);
  return data.user;
}

export async function logoutRequest() {
  try {
    await api.post("/auth/logout");
  } finally {
    // صرف‌نظر از موفقیت درخواست سرور، وضعیت سمت کاربر همیشه پاک می‌شود
    // تا کاربر هرگز در حالت "خروج ناقص" گیر نکند
    clearAccessToken();
  }
}

// تلاش برای بازیابی نشست با کوکی httpOnly موجود — برای زمانی که کاربر
// صفحه را رفرش می‌کند و access token حافظه‌ای از بین رفته، اما کوکی refresh
// هنوز معتبر است. اگر کوکی معتبر نباشد (کاربر هرگز وارد نشده یا نشست
// منقضی شده)، این تابع خطا می‌دهد و صدازننده باید کاربر را خارج در نظر بگیرد.
export async function refreshRequest() {
  const { data } = await api.post("/auth/refresh");
  setAccessToken(data.accessToken);
  return data.user;
}
