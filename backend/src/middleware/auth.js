import { verifyAccessToken } from "../utils/tokens.js";
import { UnauthorizedError, ForbiddenError } from "../utils/AppError.js";

// این middleware مطمئن می‌شود کاربر یک access token معتبر ارسال کرده است.
// توکن باید در هدر Authorization به‌شکل «Bearer <token>» باشد (نه در کوکی —
// چون access token در فرانت‌اند فقط در حافظه نگه‌داری می‌شود، نه کوکی).
export function requireAuth(req, _res, next) {
  const header = req.headers.authorization;

  if (!header?.startsWith("Bearer ")) {
    return next(new UnauthorizedError("توکن دسترسی ارسال نشده است"));
  }

  const token = header.slice(7);

  try {
    const payload = verifyAccessToken(token);
    req.user = { id: payload.sub, role: payload.role };
    return next();
  } catch {
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
