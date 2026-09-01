import { z } from "zod";

export const listProductsSchema = z.object({
  body: z.object({}).optional(),
  params: z.object({}).optional(),
  query: z.object({
    page: z.coerce.number().int().min(1).default(1),
    pageSize: z.coerce.number().int().min(1).max(100).default(10),
    search: z.string().trim().max(100).optional(),
    category: z.string().trim().max(100).optional(),
  }),
});

export const productIdParamSchema = z.object({
  body: z.object({}).optional(),
  query: z.object({}).optional(),
  params: z.object({ id: z.string().cuid("شناسه محصول نامعتبر است") }),
});

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
  }),
});

export const updateProductSchema = z.object({
  query: z.object({}).optional(),
  params: z.object({ id: z.string().cuid("شناسه محصول نامعتبر است") }),
  body: createProductSchema.shape.body.partial(),
});
