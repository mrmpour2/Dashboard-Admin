import pino from "pino";
import { isProd } from "./env.js";

// در توسعه، خروجی خوانا و رنگی؛ در production، JSON ساختاریافته برای ابزارهای مانیتورینگ
export const logger = pino({
  level: isProd ? "info" : "debug",
  transport: isProd
    ? undefined
    : {
        target: "pino-pretty",
        options: { colorize: true, translateTime: "SYS:HH:MM:ss" },
      },
  // هرگز داده‌های حساس را در لاگ‌ها ثبت نکن
  redact: {
    paths: [
      "req.headers.authorization",
      "req.headers.cookie",
      "*.password",
      "*.passwordHash",
      "*.token",
      "*.accessToken",
      "*.refreshToken",
    ],
    remove: true,
  },
});
