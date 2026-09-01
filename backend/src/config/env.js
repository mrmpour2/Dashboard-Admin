import { z } from "zod";
import "dotenv/config";

// اعتبارسنجی متغیرهای محیطی در لحظه راه‌اندازی سرور.
// اگر مقداری غایب یا نامعتبر باشد، سرور اصلاً بالا نمی‌آید —
// بهتر از این است که با تنظیمات ناقص/ناامن در production اجرا شود.
const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(4000),
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
  BCRYPT_SALT_ROUNDS: z.coerce.number().int().min(10).max(15).default(12),
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
  console.error("❌ در production نمی‌توانید از رمزهای نمونه .env.example استفاده کنید.");
  process.exit(1);
}

export const env = parsed.data;
export const isProd = env.NODE_ENV === "production";
