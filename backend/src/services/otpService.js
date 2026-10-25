import crypto from "node:crypto";
import { prisma } from "../config/prisma.js";
import { env } from "../config/env.js";
import { AppError, BadRequestError } from "../utils/AppError.js";
import { securityProviders } from "./securityProviders.js";

export function normalizeMobile(value) {
  let phone = String(value ?? "").replace(/[۰-۹]/g, d => String(d.charCodeAt(0) - 0x6f0))
    .replace(/[٠-٩]/g, d => String(d.charCodeAt(0) - 0x660)).replace(/[\s()-]/g, "");
  if (phone.startsWith("+98")) phone = "0" + phone.slice(3);
  else if (phone.startsWith("0098")) phone = "0" + phone.slice(4);
  if (!/^09\d{9}$/.test(phone)) throw new BadRequestError("شماره موبایل معتبر وارد کنید.");
  return phone;
}
export function digest(value) {
  return crypto.createHmac("sha256", env.OTP_HASH_SECRET || env.JWT_ACCESS_SECRET).update(String(value)).digest("hex");
}
export async function securityAudit(tx, action, subject, details = {}) {
  return tx.securityAudit.create({ data: { action, subject: digest(subject), details } });
}
export async function lockKeys(tx, keys) {
  for (const key of [...new Set(keys)].sort()) {
    await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtextextended(${key}, 0))::text`;
  }
}
export async function requestOtp({ phone: rawPhone, subject = "checkout", ip = "unknown", captchaToken, now = new Date() }) {
  const phone = normalizeMobile(rawPhone);
  if (!["checkout", "club"].includes(subject)) throw new BadRequestError("درخواست نامعتبر است.");
  const phoneHash = digest(phone), ipHash = digest(ip);
  const code = String(crypto.randomInt(0, 1_000_000)).padStart(6, "0");
  // The captcha provider call is an HTTP request (up to seconds); it must never run
  // while a transaction holds advisory locks. So: transaction -> (captcha) -> transaction.
  let captchaVerified = false;
  let outcome;
  for (let pass = 0; pass < 2; pass++) {
    outcome = await prisma.$transaction(async tx => {
      await lockKeys(tx, [`otp:phone:${phoneHash}`, `otp:ip:${ipHash}`]);
      const day = new Date(now.getTime() - 86400000);
      const phoneCount = await tx.otpCode.count({ where: { phoneHash, createdAt: { gte: day } } });
      const ipCount = await tx.otpCode.count({ where: { ipHash, createdAt: { gte: day } } });
      const latest = await tx.otpCode.findFirst({ where: { phoneHash, subject }, orderBy: { createdAt: "desc" } });
      if (phoneCount >= env.OTP_DAILY_PHONE_LIMIT || ipCount >= env.OTP_DAILY_IP_LIMIT ||
          (latest && now.getTime() - latest.createdAt.getTime() < 60000)) {
        await securityAudit(tx, "otp.rate_limited", phone, { ipHash });
        return { error: "RATE_LIMITED" };
      }
      if (phoneCount >= 3 && !captchaVerified) return { needCaptcha: true };
      await tx.otpCode.updateMany({ where: { phoneHash, subject, consumedAt: null }, data: { consumedAt: now } });
      const otp = await tx.otpCode.create({ data: { phoneHash, ipHash, subject, codeHash: digest(`${subject}:${phone}:${code}`),
        createdAt: now, expiresAt: new Date(now.getTime() + 300000) } });
      return { id: otp.id };
    }, { timeout: 10000 });
    if (!outcome.needCaptcha) break;
    if (!await securityProviders.verifyCaptcha(captchaToken, ip === "unknown" ? undefined : ip)) {
      await securityAudit(prisma, "otp.captcha_required", phone, { ipHash });
      outcome = { error: "CAPTCHA_REQUIRED" };
      break;
    }
    captchaVerified = true;
  }
  if (outcome.error || outcome.needCaptcha) throw new AppError("امکان ارسال کد نیست؛ کمی بعد تلاش کنید.", 429, outcome.error ?? "CAPTCHA_REQUIRED");
  try { await securityProviders.sendOtp({ phone, code, subject }); }
  catch (error) {
    await prisma.otpCode.update({ where: { id: outcome.id }, data: { consumedAt: now } });
    throw error;
  }
  return { challengeId: outcome.id, message: "در صورت امکان، کد تأیید ارسال می‌شود.", expiresIn: 300, resendAfter: 60 };
}
// Errors are returned from the transaction so failed-attempt counters commit.
export async function consumeOtp({ challengeId, phone: rawPhone, subject, code, captchaToken, ip, now = new Date() }) {
  const phone = normalizeMobile(rawPhone);
  // Captcha (HTTP) is checked BEFORE the row-locking transaction, only when this challenge
  // already has 3+ failed attempts. The authoritative attempts check still runs under the lock.
  let captchaVerified = false;
  const preview = await prisma.otpCode.findUnique({ where: { id: String(challengeId) }, select: { attempts: true } });
  if (preview && preview.attempts >= 3 && preview.attempts < 5) {
    captchaVerified = await securityProviders.verifyCaptcha(captchaToken, ip);
    if (!captchaVerified) {
      await securityAudit(prisma, "otp.captcha_required", phone);
      throw new AppError("کد تأیید معتبر نیست یا منقضی شده است.", 429, "CAPTCHA_REQUIRED");
    }
  }
  const outcome = await prisma.$transaction(async tx => {
    await tx.$queryRaw`SELECT id FROM otp_codes WHERE id=${String(challengeId)} FOR UPDATE`;
    const otp = await tx.otpCode.findUnique({ where: { id: String(challengeId) } });
    const expected = digest(`${subject}:${phone}:${String(code)}`);
    const valid = crypto.timingSafeEqual(Buffer.from(expected, "hex"), Buffer.from(otp?.codeHash ?? "0".repeat(64), "hex"));
    if (!otp || otp.subject !== subject || otp.phoneHash !== digest(phone) || otp.consumedAt || otp.expiresAt <= now || otp.attempts >= 5) return false;
    if (otp.attempts >= 3 && !captchaVerified) return "captcha";
    await tx.otpCode.update({ where: { id: otp.id }, data: { attempts: { increment: 1 }, ...(valid ? { consumedAt: now } : {}) } });
    await securityAudit(tx, valid ? "otp.verified" : "otp.failed", phone, { attempts: otp.attempts + 1 });
    if (!valid && otp.attempts + 1 === 3) {
      await tx.securityOutbox.upsert({ where: { key: `otp-alert:${otp.id}` }, update: {}, create: { key: `otp-alert:${otp.id}`, kind: "notification", orderId: otp.id, payload: { reason: "otp_failed_attempts", phoneHash: otp.phoneHash, subject, attempts: 3 } } });
    }
    return valid;
  });
  if (outcome !== true) throw new AppError("کد تأیید معتبر نیست یا منقضی شده است.", outcome === "captcha" ? 429 : 400, outcome === "captcha" ? "CAPTCHA_REQUIRED" : "INVALID_OTP");
  return phone;
}
