import { z } from "zod";

/**
 * اعتبارسنجی نظرهای مشتریان.
 *
 * محدوده‌ها عمداً همان محدوده‌های اعتبارسنجی سمت وب‌سایت
 * (`website/src/utils/reviews.ts`) هستند تا خطای سمت سرور و کلاینت یک‌شکل باشد:
 * امتیاز ۱ تا ۵، نام ≤ ۶۰ نویسه، متن ۱۰ تا ۱۰۰۰ نویسه.
 */

/** قالب شمارهٔ سفارش؛ هم‌سبک با کلاینت وب‌سایت (مثل `ORD-M1A2B3-4F5A6B`). */
const ORDER_NUMBER_PATTERN = /^[A-Z0-9]{2,4}-[A-Z0-9]{1,20}-[A-Z0-9]{4,12}$/;
/**
 * قالب شمارهٔ تماس مشتری.
 *
 * کاربر ایرانی شماره را با ارقام فارسی/عربی، فاصله، خط تیره یا پرانتز می‌نویسد؛
 * همان الگوی `paymentController` اینجا هم پذیرفته می‌شود و سرویس بعداً آن را به
 * شکل نرمال (ارقام لاتین، بدون جداکننده) ذخیره می‌کند.
 */
const PHONE_PATTERN = /^[+\d\u06F0-\u06F9\u0660-\u0669()\-\s]{8,20}$/;
const REVIEW_STATUSES = ["PENDING", "APPROVED", "REJECTED"];

/** پرچم «بله/خیر» کوئری؛ هم `0/1` و هم `true/false` پذیرفته می‌شود. */
const booleanFlag = z
  .enum(["0", "1", "true", "false"])
  .transform((value) => value === "1" || value === "true");

export const listPublicReviewsSchema = z.object({
  params: z.object({}).optional(),
  query: z.object({
    // شناسهٔ محصول در دیتابیس پنل؛ اگر وجود نداشته باشد فهرست خالی برمی‌گردد
    // (مسیر عمومی نباید برای شناسهٔ نامعتبر خطا بدهد).
    productId: z.string().trim().min(1).max(64),
    page: z.coerce.number().int().min(1).default(1),
    pageSize: z.coerce.number().int().min(1).max(24).default(6),
    sort: z.enum(["newest", "oldest", "highest", "lowest"]).default("newest"),
    rating: z.coerce.number().int().min(1).max(5).optional(),
    withImages: booleanFlag.optional(),
  }),
});

export const createPublicReviewSchema = z.object({
  params: z.object({}).optional(),
  query: z.object({}).optional(),
  body: z.object({
    productId: z.string().trim().min(1).max(64),
    authorName: z.string().trim().min(2, "نام باید حداقل ۲ نویسه باشد").max(60),
    rating: z.coerce.number().int().min(1, "امتیاز باید بین ۱ تا ۵ باشد").max(5, "امتیاز باید بین ۱ تا ۵ باشد"),
    body: z.string().trim().min(10, "متن نظر باید حداقل ۱۰ نویسه باشد").max(1000),
    // اختیاری؛ فقط برای پرچم «خرید تأییدشده» استفاده می‌شود.
    orderNumber: z
      .string()
      .trim()
      .regex(ORDER_NUMBER_PATTERN, "قالب شمارهٔ سفارش نامعتبر است")
      .optional()
      .or(z.literal("")),
    // اختیاری؛ شمارهٔ تماس مشتری برای پیگیری در پنل مدیریت. هرگز در پاسخ‌های
    // عمومی وب‌سایت نمایش داده نمی‌شود.
    authorPhone: z
      .string()
      .trim()
      .regex(PHONE_PATTERN, "شمارهٔ تماس نامعتبر است")
      .optional()
      .or(z.literal("")),
  }),
});

export const listTableTalkSchema = z.object({
  params: z.object({}).optional(),
  query: z.object({
    limit: z.coerce.number().int().min(1).max(24).optional(),
  }),
});

export const listReviewsSchema = z.object({
  params: z.object({}).optional(),
  query: z.object({
    page: z.coerce.number().int().min(1).default(1),
    pageSize: z.coerce.number().int().min(1).max(100).default(20),
    search: z.string().trim().max(100).optional(),
    status: z.enum(REVIEW_STATUSES).optional(),
    featured: booleanFlag.optional(),
  }),
});

export const reviewIdParamSchema = z.object({
  body: z.object({}).optional(),
  query: z.object({}).optional(),
  params: z.object({ id: z.string().trim().min(1).max(64) }),
});

/**
 * ویرایش نظر از پنل مدیریت؛ بدنهٔ خالی رد می‌شود تا درخواست بی‌اثر ثبت نشود.
 *
 * `featured` همان کلید «نمایش در Table Talk صفحهٔ اصلی» است و `status` تعیین
 * می‌کند نظر منتشر شود یا نه.
 */
export const updateReviewSchema = z.object({
  query: z.object({}).optional(),
  params: z.object({ id: z.string().trim().min(1).max(64) }),
  body: z
    .object({
      authorName: z.string().trim().min(2).max(60).optional(),
      authorNameEn: z.string().trim().max(60).optional().or(z.literal("")),
      // شمارهٔ تماس مشتری؛ مدیر می‌تواند آن را اصلاح یا (با رشتهٔ خالی) پاک کند.
      authorPhone: z
        .string()
        .trim()
        .regex(PHONE_PATTERN, "شمارهٔ تماس نامعتبر است")
        .optional()
        .or(z.literal("")),
      rating: z.coerce.number().int().min(1).max(5).optional(),
      body: z.string().trim().min(10).max(1000).optional(),
      bodyEn: z.string().trim().max(1000).optional().or(z.literal("")),
      status: z.enum(REVIEW_STATUSES).optional(),
      featured: z.coerce.boolean().optional(),
      featuredOrder: z.coerce.number().int().min(0).max(999).optional(),
      replyBody: z.string().trim().max(1000).optional().or(z.literal("")),
    })
    .refine((data) => Object.keys(data).length > 0, { message: "حداقل یک فیلد برای تغییر لازم است" }),
});
