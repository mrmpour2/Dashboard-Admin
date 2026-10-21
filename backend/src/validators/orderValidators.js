import { z } from "zod";

const statusEnum = z.enum(["PENDING", "PROCESSING", "SHIPPED", "DELIVERED", "CANCELLED"]);

export const listOrdersSchema = z.object({
  body: z.object({}).optional(),
  params: z.object({}).optional(),
  query: z.object({
    page: z.coerce.number().int().min(1).default(1),
    pageSize: z.coerce.number().int().min(1).max(100).default(10),
    status: statusEnum.optional(),
    customerId: z.string().cuid().optional(),
  }),
});

export const orderIdParamSchema = z.object({
  body: z.object({}).optional(),
  query: z.object({}).optional(),
  params: z.object({ id: z.string().cuid("شناسه سفارش نامعتبر است") }),
});

export const createOrderSchema = z.object({
  query: z.object({}).optional(),
  params: z.object({}).optional(),
  body: z.object({
    customerId: z.string().cuid("مشتری انتخاب‌شده نامعتبر است"),
    couponCode: z.string().trim().min(1).max(30).optional(),
    items: z
      .array(
        z.object({
          productId: z.string().cuid("محصول انتخاب‌شده نامعتبر است"),
          quantity: z.coerce.number().int().min(1, "تعداد باید حداقل ۱ باشد"),
        }),
      )
      .min(1, "سفارش باید حداقل یک قلم کالا داشته باشد")
      .max(50, "تعداد اقلام سفارش بیش از حد مجاز است")
      .refine((items) => new Set(items.map((item) => item.productId)).size === items.length, "محصول تکراری در سفارش مجاز نیست"),
  }),
});

export const updateOrderStatusSchema = z.object({
  query: z.object({}).optional(),
  params: z.object({ id: z.string().cuid("شناسه سفارش نامعتبر است") }),
  body: z.object({
    status: statusEnum,
  }),
});
