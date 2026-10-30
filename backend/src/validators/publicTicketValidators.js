import { z } from "zod";

const empty = z.object({}).optional();
const mobile = z.string().trim().min(8).max(20);
const captchaToken = z.string().trim().min(1).max(2048);

export const createPublicTicketSchema = z.object({
  params: empty,
  query: empty,
  body: z.object({
    name: z.string().trim().min(2).max(120),
    phone: mobile,
    title: z.string().trim().min(3).max(160),
    category: z.enum(["order", "payment", "delivery", "product", "other"]),
    message: z.string().trim().min(5).max(5000),
    orderNumber: z.string().trim().max(80).optional().or(z.literal("")),
    captchaToken,
  }),
});

export const trackPublicTicketSchema = z.object({
  params: empty,
  query: empty,
  body: z.object({ phone: mobile, trackingCode: z.string().trim().regex(/^[A-F0-9]{10}$/i) }),
});

export const replyPublicTicketSchema = z.object({
  params: empty,
  query: empty,
  body: z.object({
    phone: mobile,
    trackingCode: z.string().trim().regex(/^[A-F0-9]{10}$/i),
    content: z.string().trim().min(1).max(3000),
    captchaToken,
  }),
});
