import { z } from "zod";
import "dotenv/config";

// اعتبارسنجی متغیرهای محیطی در لحظه راه‌اندازی سرور.
// اگر مقداری غایب یا نامعتبر باشد، سرور اصلاً بالا نمی‌آید —
// بهتر از این است که با تنظیمات ناقص/ناامن در production اجرا شود.
const envSchema = z.object({
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
  PORT: z.coerce.number().int().positive().default(5000),
  DATABASE_URL: z.string().default(""),

  CORS_ORIGIN: z
    .string()
    .min(1, "CORS_ORIGIN is required (comma-separated list of allowed origins)"),
  JWT_ACCESS_SECRET: z
    .string()
    .min(32, "JWT_ACCESS_SECRET must be at least 32 characters"),
  JWT_REFRESH_SECRET: z
    .string()
    .min(32, "JWT_REFRESH_SECRET must be at least 32 characters"),
  JWT_ACCESS_EXPIRES_IN: z.string().default("15m"),
  JWT_REFRESH_EXPIRES_IN: z.string().default("30d"),
  REFRESH_COOKIE_NAME: z.string().default("refresh_token"),
  ENABLE_PUBLIC_REGISTRATION: z
    .enum(["true", "false"])
    .default("false")
    .transform((value) => value === "true"),
  BCRYPT_SALT_ROUNDS: z.coerce.number().int().min(10).max(15).default(12),
  // کلید دستیار گفتگو اختیاری است: اگر خالی باشد سرور بالا می‌آید ولی
  // مسیر POST /api/chat با خطای 503 پاسخ می‌دهد.
  OPENAI_API_KEY: z.string().trim().default(""),
  OPENAI_BASE_URL: z.string().trim().default(""),
  OPENAI_MODEL: z
    .string()
    .trim()
    .default("gpt-4o-mini")
    .transform((model) => model || "gpt-4o-mini"),
  STORE_NAME: z.string().trim().default("6Burger-Elin"),
  STORE_ADDRESS: z
    .string()
    .trim()
    .default("بیرجند - خیابان پاسداران - تقاطع ۱۵ خرداد"),
  STORE_HOURS: z.string().trim().default("نیاز به مقدار واقعی"),
  SHIPPING_POLICY: z
    .string()
    .trim()
    .default("شرایط ارسال هنوز تنظیم نشده است."),
  RETURN_POLICY: z
    .string()
    .trim()
    .default("شرایط بازگشت کالا هنوز تنظیم نشده است."),
  DELIVERY_FEE_TOMAN: z.coerce.number().int().min(0).default(100000),
  VAT_RATE_BPS: z.coerce.number().int().min(0).max(10000).default(1000),
  ABANDONED_CART_MINUTES: z.coerce.number().int().min(1).max(1440).default(30),
  SUPPORT_PHONE: z.string().trim().default("05632420101"),
  PUBLIC_API_BASE_URL: z.string().url().default("http://localhost:5000/api"),
  FRONTEND_URL: z.string().url().default("http://localhost:5174"),
  SECURITY_PROVIDER_MODE: z
    .enum(["disabled", "mock", "sandbox", "production"])
    .default("mock"),
  SMS_ENABLED: z.enum(["true", "false"]).default("false").transform((value) => value === "true"),
  OTP_ENABLED: z.enum(["true", "false"]).default("false").transform((value) => value === "true"),
  OTP_HASH_SECRET: z.string().default(""),
  // Cloudflare Turnstile secret. Empty = real captcha verification fails closed.
  TURNSTILE_SECRET_KEY: z.string().trim().default(""),
  OTP_DAILY_PHONE_LIMIT: z.coerce.number().int().min(1).default(10),
  OTP_DAILY_IP_LIMIT: z.coerce.number().int().min(1).default(50),
  SMSIR_API_KEY: z.string().optional(),
  SMSIR_LINE_NUMBER: z.string().optional(),
  SMSIR_TEMPLATE_ID: z.string().optional(),
  STOCK_ROLLOUT_PERCENT: z.coerce.number().int().min(0).max(100).default(0),
  STOCK_ONLINE_TTL_SECONDS: z.coerce.number().int().positive().default(900),
  STOCK_WALLET_TTL_SECONDS: z.coerce.number().int().positive().default(300),
  STOCK_JOB_DRY_RUN: z
    .enum(["true", "false"])
    // Production must actually release expired reservations unless the operator
    // explicitly opts into a dry run. Keep development read-only by default.
    .default(process.env.NODE_ENV === "production" ? "false" : "true")
    .transform((v) => v === "true"),
  // Express "trust proxy": a hop count ("1" = one reverse proxy such as the
  // website nginx container), "loopback", or a comma-separated list of IPs/CIDRs.
  // If this does not match the real topology every visitor shares the proxy's IP
  // and the per-IP guest/OTP limits become global limits.
  TRUSTED_PROXY: z.string().trim().default("loopback"),
  CHAT_RECEIPTS_DIR: z.string().trim().default("uploads/chat-receipts"),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error("❌ خطا در متغیرهای محیطی (.env):");
  console.error(parsed.error.flatten().fieldErrors);
  process.exit(1);
}

// هشدار در حالت production اگر رمزهای پیش‌فرض/نمونه استفاده شده باشند
if (
  parsed.data.NODE_ENV === "production" &&
  (parsed.data.JWT_ACCESS_SECRET.includes("REPLACE_WITH") ||
    parsed.data.JWT_REFRESH_SECRET.includes("REPLACE_WITH"))
) {
  console.error(
    "❌ در production نمی‌توانید از رمزهای نمونه .env.example استفاده کنید.",
  );
  process.exit(1);
}

export const env = parsed.data;
export const isProd = env.NODE_ENV === "production";

if (isProd && env.SECURITY_PROVIDER_MODE === "mock")
  throw new Error("Mock security providers are forbidden in production");
