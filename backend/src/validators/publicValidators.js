import { z } from "zod";

/**
 * اعتبارسنجی مسیرهای عمومی (وب‌سایت مهمان + دستیار گفتگو).
 * این مسیرها هیچ توکنی نمی‌خواهند، پس سخت‌گیرانه محدود می‌شوند تا ورودی
 * بزرگ یا مخرب به سرویس‌های داخلی (دیتابیس و مدل زبانی) نرسد.
 */

export const listPublicMenuSchema = z.object({
  params: z.object({}).optional(),
  query: z.object({
    // فیلتر روی رشته خام دیتابیس اعمال می‌شود (مثل «برگر»)
    category: z.string().trim().min(1).max(100).optional(),
  }),
});

export const publicMenuItemSchema = z.object({
  query: z.object({}).optional(),
  params: z.object({
    // یا cuid داخلی یا slug ساخته‌شده از نام؛ پس نمی‌تواند cuid-only باشد.
    id: z.string().trim().min(1).max(200),
  }),
});

export const chatRequestSchema = z.object({
  params: z.object({}).optional(),
  query: z.object({}).optional(),
  body: z.object({
    language: z.enum(["en", "fa"]).optional(),
    sessionId: z
      .string()
      .trim()
      .min(20)
      .max(100)
      .regex(/^[\w-]+$/)
      .optional(),
    messages: z
      .array(
        z.object({
          id: z.string().trim().max(100).optional(),
          role: z.enum(["user", "assistant"]),
          parts: z.array(z.record(z.any())).max(50).optional(), // اجازه عبور هر ساختاری در پارت‌ها
          content: z.string().max(4000).optional(),
        }),
      )
      .min(1, "حداقل یک پیام لازم است")
      .max(40, "تعداد پیام‌ها بیش از حد مجاز است"),
  }),
});
