import { prisma } from "../config/prisma.js";
import { verifyAccessToken } from "../utils/tokens.js";
import { UnauthorizedError, ForbiddenError } from "../utils/AppError.js";

// این middleware مطمئن می‌شود کاربر یک access token معتبر ارسال کرده است.
// توکن باید در هدر Authorization به‌شکل «Bearer <token>» باشد (نه در کوکی —
// چون access token در فرانت‌اند فقط در حافظه نگه‌داری می‌شود، نه کوکی).
export async function requireAuth(req, _res, next) {
  const header = req.headers.authorization;

  if (!header?.startsWith("Bearer ")) {
    return next(new UnauthorizedError("توکن دسترسی ارسال نشده است"));
  }

  const token = header.slice(7);

  try {
    const payload = verifyAccessToken(token);
    const user = await prisma.user.findUnique({ where: { id: payload.sub } });
    if (!user || user.status !== "ACTIVE" || user.authVersion !== (payload.version || 0)) return next(new UnauthorizedError("نشست نامعتبر است، دوباره وارد شوید"));
    const { passwordHash, authVersion, ...safeUser } = user;
    void passwordHash;
    void authVersion;
    req.user = safeUser;
    return next();
  } catch (error) {
    if (!["JsonWebTokenError", "TokenExpiredError", "NotBeforeError"].includes(error.name)) return next(error);
    return next(new UnauthorizedError("توکن دسترسی نامعتبر یا منقضی شده است"));
  }
}

// محدود کردن یک route به نقش‌های خاص. باید بعد از requireAuth استفاده شود.
export function requireRole(...allowedRoles) {
  return (req, _res, next) => {
    if (!req.user) {
      return next(new UnauthorizedError());
    }
    if (!allowedRoles.includes(req.user.role)) {
      return next(new ForbiddenError());
    }
    return next();
  };
}
