import { z } from "zod";
import { passwordSchema } from "./passwordPolicy.js";

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
    sortBy: z.enum(["id", "name", "email", "role", "createdAt"]).default("createdAt"),
    sortOrder: z.enum(["asc", "desc"]).default("desc"),
  }),
});

export const userIdParamSchema = z.object({
  body: z.object({}).optional(),
  query: z.object({}).optional(),
  params: z.object({
    id: z.string().cuid("شناسه کاربر نامعتبر است"),
  }),
});


export const createUserSchema = z.object({
  query: z.object({}).optional(),
  params: z.object({}).optional(),
  body: z.object({
    name: z.string().trim().min(2).max(100),
    email: z.string().email().max(320),
    password: passwordSchema,
    role: roleEnum.default("STAFF"),
    status: statusEnum.default("ACTIVE"),
  }),
});

export const updateProfileSchema = z.object({
  body: z.object({
    name: z.string().trim().min(2).max(100).optional(),
    avatarUrl: z.string().max(15000).refine((value) => value.startsWith("data:image/svg+xml,") || /^https?:\/\//.test(value), "آواتار نامعتبر است").nullable().optional(),
  }).refine((data) => Object.keys(data).length > 0, { message: "حداقل یک فیلد الزامی است" }),
});

export const changePasswordSchema = z.object({
  body: z.object({
    currentPassword: z.string().min(1),
    newPassword: passwordSchema,
  }).refine((data) => data.currentPassword !== data.newPassword, { message: "رمز جدید باید متفاوت باشد" }),
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
