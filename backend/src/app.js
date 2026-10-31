import express from "express";
import helmet from "helmet";
import cors from "cors";
import cookieParser from "cookie-parser";
import compression from "compression";
import hpp from "hpp";
import { pinoHttp } from "pino-http";
import { ForbiddenError } from "./utils/AppError.js";

import { env } from "./config/env.js";
import { logger } from "./config/logger.js";
import apiRoutes from "./routes/index.js";
import { errorHandler, notFoundHandler } from "./middleware/errorHandler.js";
import { generalLimiter } from "./middleware/rateLimiters.js";
import { productUploadsDirectory } from "./middleware/upload.js";

const app = express();

// در پشت یک reverse proxy (nginx/Cloudflare) اجرا می‌شود، پس به IP واقعی کاربر اعتماد می‌کنیم
// (لازم برای درست‌کارکردن rate limiting و req.ip)
const trustProxy = /^\d+$/.test(env.TRUSTED_PROXY)
  ? Number(env.TRUSTED_PROXY)
  : env.TRUSTED_PROXY.includes(",")
    ? env.TRUSTED_PROXY.split(",").map((v) => v.trim()).filter(Boolean)
    : env.TRUSTED_PROXY;
app.set("trust proxy", trustProxy);

// --- امنیت هدرهای HTTP ---
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        imgSrc: ["'self'", "data:", "https:"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        objectSrc: ["'none'"],
        frameAncestors: ["'none'"],
      },
    },
    crossOriginResourcePolicy: { policy: "same-site" },
  }),
);
// --- CORS محدود به origin(های) مشخص‌شده در env، با پشتیبانی از کوکی ---
const allowedOrigins = env.CORS_ORIGIN.split(",").map((o) => o.trim());
const corsMiddleware = cors({
  origin(origin, callback) {
    // درخواست‌های بدون origin (مثل curl/Postman در توسعه) مجاز هستند
    if (!origin || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    return callback(new ForbiddenError("این origin توسط CORS مجاز نیست"));
  },
  credentials: true,
});
// بازگشت از درگاه پرداخت یک ناوبری مرورگر از دامنهٔ درگاه است (نه فراخوانی
// cross-origin اسکریپت)؛ مرورگر Origin درگاه را می‌فرستد و CORS نباید آن را رد کند.
// اعتبار این مسیر با verify سمت سرور به درگاه تضمین می‌شود، نه با CORS.
const CORS_EXEMPT_PATHS = new Set();
app.use((req, res, next) =>
  CORS_EXEMPT_PATHS.has(req.path) ? next() : corsMiddleware(req, res, next),
);

app.use(compression());
app.use(express.json({ limit: "7mb" }));
app.use(express.urlencoded({ extended: true, limit: "1mb" }));
app.use(cookieParser());

// جلوگیری از HTTP Parameter Pollution (مثل ?role=ADMIN&role=STAFF)
app.use(hpp());

app.use("/uploads/products", express.static(productUploadsDirectory, { acceptRanges: true, dotfiles: "deny", index: false, immutable: true, maxAge: "1y" }));

app.use(pinoHttp({ logger }));

app.use("/api", generalLimiter, apiRoutes);

app.use(notFoundHandler);
app.use(errorHandler);

export default app;
