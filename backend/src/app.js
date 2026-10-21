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

const app = express();

// در پشت یک reverse proxy (nginx/Cloudflare) اجرا می‌شود، پس به IP واقعی کاربر اعتماد می‌کنیم
// (لازم برای درست‌کارکردن rate limiting و req.ip)
app.set("trust proxy", env.TRUSTED_PROXY);

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
app.use(
  cors({
    origin(origin, callback) {
      // درخواست‌های بدون origin (مثل curl/Postman در توسعه) مجاز هستند
      if (!origin || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      return callback(new ForbiddenError("این origin توسط CORS مجاز نیست"));
    },
    credentials: true,
  }),
);

app.use(compression());
app.use(express.json({ limit: "7mb" }));
app.use(express.urlencoded({ extended: true, limit: "1mb" }));
app.use(cookieParser());

// جلوگیری از HTTP Parameter Pollution (مثل ?role=ADMIN&role=STAFF)
app.use(hpp());

app.use(pinoHttp({ logger }));

app.use("/api", generalLimiter, apiRoutes);

app.use(notFoundHandler);
app.use(errorHandler);

export default app;
