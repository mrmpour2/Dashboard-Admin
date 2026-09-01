import { z } from "zod";

const roleEnum = z.enum(["ADMIN", "MANAGER", "STAFF"]);
const statusEnum = z.enum(["ACTIVE", "INACTIVE", "SUSPENDED"]);

export const listUsersSchema = z.object({
  body: z.object({}).optional(),
  params: z.object({}).optional(),
  query: z.object({
    page: z.coerce.number().int().min(1).default(1),
    pageSize: z.coerce.number().int().min(1).max(100).default(10),
    search: z.string().trim().max(100).optional(),
    role: roleEnum.optional(),
    status: statusEnum.optional(),
  }),
});

export const userIdParamSchema = z.object({
  body: z.object({}).optional(),
  query: z.object({}).optional(),
  params: z.object({
    id: z.string().cuid("شناسه کاربر نامعتبر است"),
  }),
});

export const updateUserSchema = z.object({
  query: z.object({}).optional(),
  params: z.object({
    id: z.string().cuid("شناسه کاربر نامعتبر است"),
  }),
  body: z
    .object({
      name: z.string().trim().min(2).max(100).optional(),
      role: roleEnum.optional(),
      status: statusEnum.optional(),
    })
    .refine((data) => Object.keys(data).length > 0, {
      message: "حداقل یک فیلد برای بروزرسانی الزامی است",
    }),
});
