import { prisma } from "../config/prisma.js";
import { CLUB_COOKIE_NAME } from "../services/clubService.js";
import { verifyClubToken } from "../utils/tokens.js";
import { UnauthorizedError } from "../utils/AppError.js";

function readClubToken(req) {
  const fromCookie = req.cookies?.[CLUB_COOKIE_NAME];
  if (typeof fromCookie === "string" && fromCookie) return fromCookie;

  // برای تست‌های API و کلاینت‌های غیرمرورگری؛ مرورگر همیشه از کوکی HttpOnly
  // استفاده می‌کند تا توکن در دسترس اسکریپت‌ها نباشد.
  const header = req.headers.authorization;
  if (header?.startsWith("Bearer ")) return header.slice(7);
  return null;
}

async function memberFromRequest(req) {
  const token = readClubToken(req);
  if (!token) return null;

  let payload;
  try {
    payload = verifyClubToken(token);
  } catch {
    return null;
  }
  if (payload.scope !== "club") return null;

  const member = await prisma.clubMember.findUnique({ where: { id: payload.sub } });
  if (!member || member.tokenVersion !== (payload.version || 0)) return null;
  return member;
}

/** ورود اجباری؛ برای مسیرهایی مثل مشاهدهٔ حساب و استرداد. */
export async function requireClubMember(req, _res, next) {
  try {
    const member = await memberFromRequest(req);
    if (!member) return next(new UnauthorizedError("برای ادامه دوباره وارد باشگاه شوید."));
    req.clubMember = member;
    return next();
  } catch (error) {
    return next(error);
  }
}

/**
 * ورود اختیاری؛ برای ثبت نظر استفاده می‌شود تا مهمان هم بتواند نظر بدهد، اما
 * اگر کوکی معتبر باشد امتیاز نظر به همان عضو تعلق بگیرد. کوکی خراب یا منقضی
 * درخواست را نمی‌بندد و فقط نادیده گرفته می‌شود.
 */
export async function optionalClubMember(req, _res, next) {
  try {
    const member = await memberFromRequest(req);
    if (member) req.clubMember = member;
    return next();
  } catch (error) {
    return next(error);
  }
}
