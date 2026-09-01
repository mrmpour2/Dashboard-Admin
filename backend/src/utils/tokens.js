import jwt from "jsonwebtoken";
import crypto from "node:crypto";
import { env } from "../config/env.js";

// --- Access Token (کوتاه‌مدت، در حافظه فرانت‌اند نگه‌داری می‌شود) ---
export function signAccessToken(user) {
  return jwt.sign(
    { sub: user.id, role: user.role },
    env.JWT_ACCESS_SECRET,
    { expiresIn: env.JWT_ACCESS_EXPIRES_IN },
  );
}

export function verifyAccessToken(token) {
  return jwt.verify(token, env.JWT_ACCESS_SECRET);
}

// --- Refresh Token (بلندمدت، فقط در کوکی httpOnly) ---
// خود توکن JWT است، اما نسخه هش‌شده‌اش هم در دیتابیس ذخیره می‌شود
// تا امکان ابطال (revoke) در لحظه لاگ‌اوت یا شناسایی فعالیت مشکوک وجود داشته باشد.
export function signRefreshToken(user) {
  return jwt.sign({ sub: user.id }, env.JWT_REFRESH_SECRET, {
    expiresIn: env.JWT_REFRESH_EXPIRES_IN,
  });
}

export function verifyRefreshToken(token) {
  return jwt.verify(token, env.JWT_REFRESH_SECRET);
}

// هش کردن توکن پیش از ذخیره در دیتابیس (خود توکن خام هرگز ذخیره نمی‌شود)
export function hashToken(token) {
  return crypto.createHash("sha256").update(token).digest("hex");
}
