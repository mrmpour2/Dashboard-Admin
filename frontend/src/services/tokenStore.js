// نگهداری توکن دسترسی (access token) فقط در حافظه، نه در localStorage/sessionStorage.
// این کار خطر سرقت توکن از طریق حملات XSS را به شدت کاهش می‌دهد.
// توکن refresh هم به‌صورت کوکی httpOnly توسط بک‌اند مدیریت می‌شود (قابل خواندن با جاوااسکریپت نیست).
let accessToken = null;

export function getAccessToken() {
  return accessToken;
}

export function setAccessToken(token) {
  accessToken = token;
}

export function clearAccessToken() {
  accessToken = null;
}
