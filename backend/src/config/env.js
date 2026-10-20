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
  DATABASE_URL: z.string().min(1, "DATABASE_URL الزامی است"),
  CORS_ORIGIN: z.string().min(1, "CORS_ORIGIN الزامی است"),
  JWT_ACCESS_SECRET: z
    .string()
    .min(32, "JWT_ACCESS_SECRET باید حداقل ۳۲ کاراکتر باشد"),
  JWT_REFRESH_SECRET: z
    .string()
    .min(32, "JWT_REFRESH_SECRET باید حداقل ۳۲ کاراکتر باشد"),
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
  STORE_NAME: z.string().trim().default("فروشگاه شما"),
  STORE_ADDRESS: z.string().trim().default("اطلاعات آدرس هنوز تنظیم نشده است."),
  STORE_HOURS: z.string().trim().default("ساعات کاری هنوز تنظیم نشده است."),
  SHIPPING_POLICY: z.string().trim().default("شرایط ارسال هنوز تنظیم نشده است."),
  RETURN_POLICY: z.string().trim().default("شرایط بازگشت کالا هنوز تنظیم نشده است."),
  SUPPORT_PHONE: z.string().trim().default(""),
  ZIBAL_MERCHANT: z.string().trim().default(""),
  ZIBAL_API_BASE_URL: z.string().url().default("https://gateway.zibal.ir/v1"),
  PUBLIC_API_BASE_URL: z.string().url().default("http://localhost:5000/api"),
  FRONTEND_URL: z.string().url().default("http://localhost:5174"),
  CARD_TO_CARD_NUMBER: z.string().trim().default(""),
  CARD_TO_CARD_OWNER: z.string().trim().default(""),
  CARD_TO_CARD_BANK: z.string().trim().default(""),
  SECURITY_PROVIDER_MODE: z.enum(["disabled", "mock"]).default("disabled"),
  OTP_HASH_SECRET: z.string().default(""),
  OTP_DAILY_PHONE_LIMIT: z.coerce.number().int().min(1).default(10),
  OTP_DAILY_IP_LIMIT: z.coerce.number().int().min(1).default(50),
  STOCK_ROLLOUT_PERCENT: z.coerce.number().int().min(0).max(100).default(0),
  STOCK_ONLINE_TTL_SECONDS: z.coerce.number().int().positive().default(900),
  STOCK_WALLET_TTL_SECONDS: z.coerce.number().int().positive().default(300),
  STOCK_JOB_DRY_RUN: z.enum(["true", "false"]).default("true").transform(v => v === "true"),
  TRUSTED_PROXY: z.string().default("loopback"),
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

if (isProd && env.SECURITY_PROVIDER_MODE === "mock") throw new Error("Mock security providers are forbidden in production");
