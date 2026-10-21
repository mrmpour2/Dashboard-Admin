import { useCallback, useEffect, useState } from "react";
import AuthContext from "./AuthContext";
import { loginRequest, logoutRequest, refreshRequest } from "../../../../services/authApi";
import { clearAccessToken } from "../../../../services/tokenStore";

function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  // isLoading=true یعنی «هنوز مشخص نیست کاربر وارد شده یا نه» —
  // تا این مرحله تمام نشود، UI نباید فرض را بر خروج بگذارد (که باعث
  // یک ریدایرکت لحظه‌ای اشتباه به صفحه ورود در هر بار رفرش صفحه می‌شود).
  const [isLoading, setIsLoading] = useState(true);

  // در بارگذاری اولیه برنامه (یا رفرش صفحه)، access token حافظه‌ای از بین رفته،
  // اما اگر کوکی refresh هنوز معتبر باشد، نشست کاربر را بی‌صدا بازیابی می‌کنیم.
  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const apiUser = await refreshRequest();
        if (!cancelled) {
          setUser(apiUser);
          setIsAuthenticated(true);
        }
      } catch {
        if (!cancelled) {
          setUser(null);
          setIsAuthenticated(false);
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  // اگر در میانه یک نشست، تمدید توکن شکست بخورد (مثلاً کوکی منقضی شده)،
  // axios.js این رویداد سراسری را پرتاب می‌کند تا هر جای برنامه بفهمد
  // باید کاربر را خارج در نظر بگیرد.
  useEffect(() => {
    const handleSessionExpired = () => {
      setUser(null);
      setIsAuthenticated(false);
    };
    window.addEventListener("auth:session-expired", handleSessionExpired);
    return () => window.removeEventListener("auth:session-expired", handleSessionExpired);
  }, []);

  const login = useCallback(async (credentials) => {
    const apiUser = await loginRequest(credentials);
    setUser(apiUser);
    setIsAuthenticated(true);
    return apiUser;
  }, []);

  const logout = useCallback(async () => {
    setIsAuthenticated(false);
    setUser(null);
    try {
      await logoutRequest();
    } catch {
      // خروج سمت کاربر در هر صورت انجام شده؛ خطای شبکه اینجا بی‌اهمیت است
      clearAccessToken();
    }
  }, []);

  // بعد از بروزرسانی موفق پروفایل (از صفحه پروفایل)، state محلی هم فوراً
  // به‌روز می‌شود تا آواتار/نام در TopBar بدون نیاز به رفرش صفحه تغییر کند.
  const updateProfile = useCallback((updatedFields) => {
    setUser((prev) => (prev ? { ...prev, ...updatedFields } : prev));
  }, []);

  return (
    <AuthContext.Provider
      value={{ user, isAuthenticated, isLoading, login, logout, updateProfile }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export default AuthProvider;
