import { logger } from "../config/logger.js";
import { isProd } from "../config/env.js";

// هندلر مرکزی خطا — آخرین middleware زنجیره است.
// هدف: کاربر پیام قابل‌فهم و امن ببیند، ولی جزئیات فنی (stack trace، اسکیمای دیتابیس، و...)
// هرگز به بیرون نشت نکند — این جزئیات فقط در لاگ سرور ثبت می‌شوند.
export function errorHandler(err, req, res, _next) {
  const conflict = err.code === "P2034" || (err.code === "P2010" && ["40001", "40P01"].includes(err.meta?.code));
  const statusCode = conflict ? 409 : err.isOperational ? err.statusCode : 500;
  const code = err.code || "INTERNAL_ERROR";

  if (statusCode >= 500) {
    logger.error({ err, path: req.path, method: req.method }, "خطای سرور");
  } else {
    logger.warn({ code, path: req.path, method: req.method }, err.message);
  }

  const message =
    conflict ? "داده‌ها هم‌زمان تغییر کرده‌اند. دوباره تلاش کنید." : err.isOperational || !isProd ? err.message : "خطایی در سرور رخ داد.";

  res.status(statusCode).json({
    message,
    code,
    ...(isProd ? {} : { stack: err.stack }),
  });
}

export function notFoundHandler(req, _res, next) {
  next(
    Object.assign(new Error(`مسیر ${req.originalUrl} یافت نشد`), {
      statusCode: 404,
      code: "ROUTE_NOT_FOUND",
      isOperational: true,
    }),
  );
}
