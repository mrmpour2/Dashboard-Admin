import rateLimit from "express-rate-limit";

// محدودیت عمومی برای کل API — جلوگیری از سوءاستفاده و DoS ساده
export const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // ۱۵ دقیقه
  limit: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "تعداد درخواست‌های شما بیش از حد مجاز است. کمی بعد تلاش کنید." },
});

// محدودیت سخت‌گیرانه‌تر برای مسیرهای احراز هویت — مقابله با brute-force روی رمز عبور
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true, // فقط تلاش‌های ناموفق را می‌شمارد
  message: { message: "تعداد تلاش‌های ورود بیش از حد مجاز است. ۱۵ دقیقه دیگر تلاش کنید." },
});
