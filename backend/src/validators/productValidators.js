import { z } from "zod";

export const listProductsSchema = z.object({
  body: z.object({}).optional(),
  params: z.object({}).optional(),
  query: z.object({
    page: z.coerce.number().int().min(1).default(1),
    pageSize: z.coerce.number().int().min(1).max(100).default(10),
    search: z.string().trim().max(100).optional(),
    category: z.string().trim().max(100).optional(),
    sortBy: z.enum(["id", "name", "category", "price", "stock", "createdAt"]).default("createdAt"),
    sortOrder: z.enum(["asc", "desc"]).default("desc"),
  }),
});

export const productIdParamSchema = z.object({
  body: z.object({}).optional(),
  query: z.object({}).optional(),
  params: z.object({ id: z.string().cuid("شناسه محصول نامعتبر است") }),
});

/** یک سایز/واریانت محصول (مثل پیتزای تک‌نفره، دو نفره و شش‌نفره). */
const variantSchema = z.object({
  label: z.string().trim().min(1, "برچسب سایز الزامی است").max(100),
  labelEn: z.string().trim().max(100).optional().or(z.literal("")),
  price: z.coerce.number().positive("قیمت سایز باید عددی مثبت باشد"),
  sortOrder: z.coerce.number().int().min(0).max(999).optional(),
  isActive: z.coerce.boolean().optional(),
});

/**
 * واریانت‌ها: حداکثر ۱۰ سایز و بدون برچسب تکراری؛ چون `(productId, label)` در
 * دیتابیس یکتاست و برچسب تکراری باعث خطای پایگاه‌داده می‌شود.
 */
const variantsSchema = z
  .array(variantSchema)
  .max(10, "حداکثر ۱۰ سایز برای هر محصول")
  .refine((items) => new Set(items.map((item) => item.label)).size === items.length, {
    message: "برچسب سایزها نباید تکراری باشد",
  });

/**
 * شناسه محصولاتی که به‌عنوان مخلفات پیشنهاد می‌شوند (نوشیدنی، ساید، سس).
 * خالی بودن یعنی «این غذا مخلفات پیشنهادی ندارد»؛ نبودن فیلد یعنی «دست نزن».
 * وجود/فعال بودن شناسه‌ها در سرویس بررسی می‌شود (نیاز به دیتابیس دارد).
 */
const addOnIdsSchema = z
  .array(z.string().cuid("شناسه مخلفات نامعتبر است"))
  .max(12, "حداکثر ۱۲ مخلفات برای هر محصول")
  .refine((ids) => new Set(ids).size === ids.length, { message: "مخلفات تکراری مجاز نیست" });

export const createProductSchema = z.object({
  query: z.object({}).optional(),
  params: z.object({}).optional(),
  body: z.object({
    name: z.string().trim().min(2).max(200),
    description: z.string().trim().max(2000).optional(),
    price: z.coerce.number().positive("قیمت باید عددی مثبت باشد"),
    stock: z.coerce.number().int().min(0).default(0),
    category: z.string().trim().max(100).optional(),
    imageUrl: z.string().url().optional().or(z.literal("")),
    // سایزهای قابل انتخاب؛ خالی یا نبودن یعنی محصول تک‌قیمت است.
    variants: variantsSchema.optional(),
    // مخلفات پیشنهادی این محصول؛ خالی یعنی هیچ پیشنهادی ندارد.
    addOnIds: addOnIdsSchema.optional(),
  }),
});

export const updateProductSchema = z.object({
  query: z.object({}).optional(),
  params: z.object({ id: z.string().cuid("شناسه محصول نامعتبر است") }),
  body: createProductSchema.shape.body.extend({ stock: z.coerce.number().int().min(0).optional() }).partial().refine((data) => Object.keys(data).length > 0, { message: "حداقل یک فیلد الزامی است" }),
});
