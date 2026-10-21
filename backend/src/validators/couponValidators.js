import { z } from "zod";

const discountTypeEnum = z.enum(["PERCENTAGE", "FIXED_AMOUNT"]);

// کد تخفیف فقط حروف بزرگ انگلیسی و عدد — یکدست‌سازی جلوی مشکلاتی مثل
// "summer10" در برابر "SUMMER10" بودن دو کد جدا را می‌گیرد
const couponCodeSchema = z
  .string()
  .trim()
  .toUpperCase()
  .min(3, "کد تخفیف باید حداقل ۳ کاراکتر باشد")
  .max(30, "کد تخفیف بیش از حد طولانی است")
  .regex(/^[A-Z0-9_-]+$/, "کد تخفیف فقط می‌تواند شامل حروف انگلیسی، عدد، خط تیره و زیرخط باشد");

export const listCouponsSchema = z.object({
  body: z.object({}).optional(),
  params: z.object({}).optional(),
  query: z.object({
    page: z.coerce.number().int().min(1).default(1),
    pageSize: z.coerce.number().int().min(1).max(100).default(10),
    isActive: z.enum(["true", "false"]).transform((value) => value === "true").optional(),
  }),
});

export const couponIdParamSchema = z.object({
  body: z.object({}).optional(),
  query: z.object({}).optional(),
  params: z.object({ id: z.string().cuid("شناسه کد تخفیف نامعتبر است") }),
});

const couponBodyBase = z.object({
  code: couponCodeSchema,
  discountType: discountTypeEnum.default("PERCENTAGE"),
  discountValue: z.coerce.number().positive("مقدار تخفیف باید عددی مثبت باشد"),
  minOrderAmount: z.coerce.number().min(0).nullable().optional(),
  maxUses: z.coerce.number().int().positive().nullable().optional(),
  isActive: z.boolean().default(true),
  expiresAt: z.coerce.date().nullable().optional(),
});

export const createCouponSchema = z
  .object({
    query: z.object({}).optional(),
    params: z.object({}).optional(),
    body: couponBodyBase,
  })
  .refine(
    (data) => data.body.discountType !== "PERCENTAGE" || data.body.discountValue <= 100,
    {
      message: "درصد تخفیف نمی‌تواند بیشتر از ۱۰۰ باشد",
      path: ["body", "discountValue"],
    },
  );

export const updateCouponSchema = z.object({
  query: z.object({}).optional(),
  params: z.object({ id: z.string().cuid("شناسه کد تخفیف نامعتبر است") }),
  body: couponBodyBase.extend({ discountType: discountTypeEnum.optional(), isActive: z.boolean().optional() }).partial().refine((data) => Object.keys(data).length > 0, {
    message: "حداقل یک فیلد برای بروزرسانی الزامی است",
  }),
});
