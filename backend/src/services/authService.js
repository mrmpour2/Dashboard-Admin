import { prisma } from "../config/prisma.js";
import { hashPassword, comparePassword } from "../utils/password.js";
import {
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
  hashToken,
} from "../utils/tokens.js";
import { ConflictError, UnauthorizedError } from "../utils/AppError.js";
import { env } from "../config/env.js";

function publicUser(user) {
  // هرگز passwordHash یا فیلدهای داخلی را برنمی‌گردانیم
  const { passwordHash, ...safe } = user;
  void passwordHash;
  return safe;
}

export async function register({ name, email, password }) {
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    // پیام عمداً کلی نیست چون این یک عملیات ثبت‌نام است، نه ورود؛
    // اما جزئیات پیاده‌سازی داخلی (مثل شناسه کاربر) فاش نمی‌شود.
    throw new ConflictError("کاربری با این ایمیل قبلاً ثبت‌نام کرده است");
  }

  const passwordHash = await hashPassword(password);

  // اولین کاربر ثبت‌شده در سیستم به‌صورت خودکار ادمین می‌شود (راه‌اندازی اولیه پنل)
  const usersCount = await prisma.user.count();
  const role = usersCount === 0 ? "ADMIN" : "STAFF";

  const user = await prisma.user.create({
    data: { name, email, passwordHash, role },
  });

  return publicUser(user);
}

export async function login({ email, password }, meta = {}) {
  const user = await prisma.user.findUnique({ where: { email } });

  // پیام یکسان برای «کاربر یافت نشد» و «رمز اشتباه» — از user enumeration جلوگیری می‌کند
  const invalidCredentials = () =>
    new UnauthorizedError("ایمیل یا رمز عبور اشتباه است");

  if (!user) throw invalidCredentials();
  if (user.status !== "ACTIVE") {
    throw new UnauthorizedError("حساب کاربری شما غیرفعال یا مسدود شده است");
  }

  const isValid = await comparePassword(password, user.passwordHash);
  if (!isValid) throw invalidCredentials();

  const accessToken = signAccessToken(user);
  const refreshToken = signRefreshToken(user);

  await prisma.refreshToken.create({
    data: {
      tokenHash: hashToken(refreshToken),
      userId: user.id,
      userAgent: meta.userAgent?.slice(0, 255),
      ipAddress: meta.ipAddress,
      expiresAt: new Date(Date.now() + refreshTtlMs()),
    },
  });

  await prisma.user.update({
    where: { id: user.id },
    data: { lastLoginAt: new Date() },
  });

  return { user: publicUser(user), accessToken, refreshToken };
}

export async function refresh(refreshTokenFromCookie) {
  if (!refreshTokenFromCookie) {
    throw new UnauthorizedError("نشست شما منقضی شده است، دوباره وارد شوید");
  }

  let payload;
  try {
    payload = verifyRefreshToken(refreshTokenFromCookie);
  } catch {
    throw new UnauthorizedError("نشست شما منقضی شده است، دوباره وارد شوید");
  }

  const tokenHash = hashToken(refreshTokenFromCookie);
  const stored = await prisma.refreshToken.findUnique({ where: { tokenHash } });

  if (!stored || stored.revokedAt || stored.expiresAt < new Date()) {
    throw new UnauthorizedError("نشست شما منقضی شده است، دوباره وارد شوید");
  }

  const user = await prisma.user.findUnique({ where: { id: payload.sub } });
  if (!user || user.status !== "ACTIVE") {
    throw new UnauthorizedError("حساب کاربری در دسترس نیست");
  }

  // چرخش توکن (rotation): توکن قدیمی باطل و یک توکن جدید صادر می‌شود.
  // این کار در صورت سرقت یک refresh token قدیمی، امکان سوءاستفاده مجدد را از بین می‌برد.
  await prisma.refreshToken.update({
    where: { id: stored.id },
    data: { revokedAt: new Date() },
  });

  const newRefreshToken = signRefreshToken(user);
  await prisma.refreshToken.create({
    data: {
      tokenHash: hashToken(newRefreshToken),
      userId: user.id,
      expiresAt: new Date(Date.now() + refreshTtlMs()),
    },
  });

  const accessToken = signAccessToken(user);
  return { accessToken, refreshToken: newRefreshToken, user: publicUser(user) };
}

export async function logout(refreshTokenFromCookie) {
  if (!refreshTokenFromCookie) return;
  const tokenHash = hashToken(refreshTokenFromCookie);
  await prisma.refreshToken
    .updateMany({
      where: { tokenHash, revokedAt: null },
      data: { revokedAt: new Date() },
    })
    .catch(() => {
      // اگر توکن از قبل نامعتبر بود، مشکلی نیست — خروج در هر صورت موفق تلقی می‌شود
    });
}

function refreshTtlMs() {
  // تبدیل ساده رشته‌هایی مثل «30d» به میلی‌ثانیه، متناسب با JWT_REFRESH_EXPIRES_IN
  const match = env.JWT_REFRESH_EXPIRES_IN.match(/^(\d+)([smhd])$/);
  if (!match) return 30 * 24 * 60 * 60 * 1000;
  const [, amount, unit] = match;
  const unitMs = { s: 1000, m: 60000, h: 3600000, d: 86400000 };
  return Number(amount) * unitMs[unit];
}
