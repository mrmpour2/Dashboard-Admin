import { startSecurityJobs } from "./services/securityJobs.js";
import app from "./app.js";
import { env } from "./config/env.js";
import { logger } from "./config/logger.js";
import { prisma } from "./config/prisma.js";

const stopSecurityJobs = startSecurityJobs();
const server = app.listen(env.PORT, () => {
  logger.info(`🚀 سرور روی پورت ${env.PORT} در حالت ${env.NODE_ENV} اجرا شد`);
});

// خاموش‌شدن مرتب (graceful shutdown): درخواست‌های در حال پردازش تمام می‌شوند
// و اتصال دیتابیس به‌درستی بسته می‌شود، تا داده ناقص/تراکنش نیمه‌کاره باقی نماند
async function shutdown(signal) {
  stopSecurityJobs();
  logger.info(`دریافت سیگنال ${signal}، در حال خاموش‌شدن مرتب...`);
  server.close(async () => {
    await prisma.$disconnect();
    logger.info("سرور با موفقیت متوقف شد");
    process.exit(0);
  });

  // اگر بعد از ۱۰ ثانیه هنوز خاموش نشد، به‌زور خارج شو
  setTimeout(() => process.exit(1), 10_000).unref();
}

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));

process.on("unhandledRejection", (reason) => {
  logger.error({ reason }, "Unhandled Promise Rejection");
});

process.on("uncaughtException", (err) => {
  logger.error({ err }, "Uncaught Exception — سرور خاموش می‌شود");
  process.exit(1);
});
