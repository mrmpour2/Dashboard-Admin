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

// دستیار گفتگو هر درخواست را به مدل زبانی می‌فرستد (هزینه و تأخیر دارد)،
// پس جدا از محدودیت عمومی کنترل می‌شود.
export const chatLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // ۵ دقیقه
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "تعداد پیام‌های شما زیاد بود. چند دقیقه دیگر دوباره بپرسید." },
});

// استرداد پاداش موجودی واقعی را تغییر می‌دهد؛ جدا از محدودیت عمومی کنترل
// می‌شود تا کلیک تکراری یا اسکریپت نتواند درخواست‌های زیادی بسازد.
export const clubRedeemLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "تعداد درخواست‌های استرداد زیاد بود. چند دقیقه دیگر تلاش کنید." },
});

// ثبت نظر مهمان بدون حساب کاربری ممکن است، پس در برابر اسپم جدا محدود می‌شود.
// خواندن نظرها (`GET /public/reviews`) محدودیتی جز محدودیت عمومی ندارد.
export const reviewSubmitLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // ۱ ساعت
  limit: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "تعداد نظرهای ارسالی شما زیاد بود. کمی بعد دوباره تلاش کنید." },
});

