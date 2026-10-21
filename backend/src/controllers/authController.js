import * as authService from "../services/authService.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { env, isProd } from "../config/env.js";

// تنظیمات کوکی refresh token:
// httpOnly: جاوااسکریپت مرورگر نمی‌تواند آن را بخواند (محافظت در برابر XSS)
// secure: در production فقط روی HTTPS ارسال می‌شود
// sameSite=strict: محافظت در برابر حملات CSRF
const REFRESH_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: isProd,
  sameSite: "strict",
  path: "/api/auth",
  maxAge: 30 * 24 * 60 * 60 * 1000,
};

export const register = asyncHandler(async (req, res) => {
  const user = await authService.register(req.body);
  res.status(201).json({ user });
});

export const login = asyncHandler(async (req, res) => {
  const { user, accessToken, refreshToken } = await authService.login(req.body, {
    userAgent: req.headers["user-agent"],
    ipAddress: req.ip,
  });

  res.cookie(env.REFRESH_COOKIE_NAME, refreshToken, REFRESH_COOKIE_OPTIONS);
  res.json({ user, accessToken });
});

export const refresh = asyncHandler(async (req, res) => {
  const token = req.cookies?.[env.REFRESH_COOKIE_NAME];
  const { accessToken, refreshToken, user } = await authService.refresh(token);

  res.cookie(env.REFRESH_COOKIE_NAME, refreshToken, REFRESH_COOKIE_OPTIONS);
  res.json({ accessToken, user });
});

export const logout = asyncHandler(async (req, res) => {
  const token = req.cookies?.[env.REFRESH_COOKIE_NAME];
  await authService.logout(token);
  res.clearCookie(env.REFRESH_COOKIE_NAME, { path: "/api/auth" });
  res.status(204).send();
});

export const me = asyncHandler(async (req, res) => {
  res.json({ user: req.user });
});
