import { z } from "zod";

const statusEnum = z.enum(["OPEN", "IN_PROGRESS", "RESOLVED", "CLOSED"]);
const priorityEnum = z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]);

export const listTicketsSchema = z.object({
  body: z.object({}).optional(),
  params: z.object({}).optional(),
  query: z.object({
    page: z.coerce.number().int().min(1).default(1),
    pageSize: z.coerce.number().int().min(1).max(100).default(10),
    status: statusEnum.optional(),
    priority: priorityEnum.optional(),
    search: z.string().trim().max(100).optional(),
    sortBy: z.enum(["createdAt", "title", "priority", "status"]).default("createdAt"),
    sortOrder: z.enum(["asc", "desc"]).default("desc"),
  }),
});

export const ticketIdParamSchema = z.object({
  body: z.object({}).optional(),
  query: z.object({}).optional(),
  params: z.object({ id: z.string().cuid("شناسه تیکت نامعتبر است") }),
});

export const createTicketSchema = z.object({
  query: z.object({}).optional(),
  params: z.object({}).optional(),
  body: z.object({
    title: z.string().trim().min(3).max(200),
    description: z.string().trim().min(3).max(5000),
    priority: priorityEnum.default("MEDIUM"),
    assignedTo: z.string().cuid().optional(),
  }),
});

export const updateTicketSchema = z.object({
  query: z.object({}).optional(),
  params: z.object({ id: z.string().cuid("شناسه تیکت نامعتبر است") }),
  body: z
    .object({
      title: z.string().trim().min(3).max(200).optional(),
      description: z.string().trim().min(3).max(5000).optional(),
      status: statusEnum.optional(),
      priority: priorityEnum.optional(),
      assignedTo: z.string().cuid().nullable().optional(),
    })
    .refine((data) => Object.keys(data).length > 0, {
      message: "حداقل یک فیلد برای بروزرسانی الزامی است",
    }),
});

export const createCommentSchema = z.object({
  query: z.object({}).optional(),
  params: z.object({ id: z.string().cuid("شناسه تیکت نامعتبر است") }),
  body: z.object({
    content: z.string().trim().min(1, "متن نظر نمی‌تواند خالی باشد").max(2000),
  }),
});
