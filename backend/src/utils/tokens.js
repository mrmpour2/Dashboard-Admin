import jwt from "jsonwebtoken";
import crypto from "node:crypto";
import { env } from "../config/env.js";

// --- Access Token (کوتاه‌مدت، در حافظه فرانت‌اند نگه‌داری می‌شود) ---
export function signAccessToken(user) {
  return jwt.sign(
    { sub: user.id, role: user.role, scope: "staff", version: user.authVersion || 0 },
    env.JWT_ACCESS_SECRET,
    { expiresIn: env.JWT_ACCESS_EXPIRES_IN, audience: "dashboard", issuer: "elin-staff" },
  );
}

export function verifyAccessToken(token) {
  return jwt.verify(token, env.JWT_ACCESS_SECRET, { audience: "dashboard", issuer: "elin-staff", algorithms: ["HS256"] });
}

// --- Refresh Token (بلندمدت، فقط در کوکی httpOnly) ---
// خود توکن JWT است، اما نسخه هش‌شده‌اش هم در دیتابیس ذخیره می‌شود
// تا امکان ابطال (revoke) در لحظه لاگ‌اوت یا شناسایی فعالیت مشکوک وجود داشته باشد.
export function signRefreshToken(user) {
  return jwt.sign({ sub: user.id, version: user.authVersion || 0 }, env.JWT_REFRESH_SECRET, {
    jwtid: crypto.randomUUID(),
    expiresIn: env.JWT_REFRESH_EXPIRES_IN,
  });
}

export function verifyRefreshToken(token) {
  return jwt.verify(token, env.JWT_REFRESH_SECRET);
}

// --- نشست باشگاه مشتریان ---
// این توکن فقط برای اعضای باشگاه است و با audience/issuer مجزا از توکن پرسنل
// جدا می‌شود؛ در کوکی HttpOnly قرار می‌گیرد و جاوااسکریپت به آن دسترسی ندارد.
const CLUB_TOKEN_EXPIRES_IN = "30d";

export function signClubToken(member) {
  return jwt.sign(
    { sub: member.id, scope: "club", version: member.tokenVersion || 0 },
    env.JWT_ACCESS_SECRET,
    { expiresIn: CLUB_TOKEN_EXPIRES_IN, audience: "club-member", issuer: "elin-club" },
  );
}

export function verifyClubToken(token) {
  return jwt.verify(token, env.JWT_ACCESS_SECRET, {
    audience: "club-member",
    issuer: "elin-club",
  });
}

// هش کردن توکن پیش از ذخیره در دیتابیس (خود توکن خام هرگز ذخیره نمی‌شود)
export function hashToken(token) {
  return crypto.createHash("sha256").update(token).digest("hex");
}
