import { z } from "zod";
export const listCommentsSchema = z.object({
  body: z.object({}).optional(), params: z.object({}).optional(),
  query: z.object({ page: z.coerce.number().int().min(1).default(1), pageSize: z.coerce.number().int().min(1).max(100).default(10), search: z.string().trim().max(100).optional(), sortBy: z.enum(["createdAt"]).default("createdAt"), sortOrder: z.enum(["asc", "desc"]).default("desc") }),
});
