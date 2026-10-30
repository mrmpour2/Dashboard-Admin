import { z } from "zod";

const empty = z.object({}).optional();
const faqFields = {
  category: z.string().trim().min(2).max(80),
  questionFa: z.string().trim().min(5).max(240),
  questionEn: z.string().trim().min(5).max(240),
  answerFa: z.string().trim().min(5).max(5000),
  answerEn: z.string().trim().min(5).max(5000),
  sortOrder: z.coerce.number().int().min(0).max(10000),
  isActive: z.boolean(),
};

export const createFaqSchema = z.object({ params: empty, query: empty, body: z.object(faqFields) });
export const updateFaqSchema = z.object({
  query: empty,
  params: z.object({ id: z.string().cuid() }),
  body: z.object(Object.fromEntries(Object.entries(faqFields).map(([key, schema]) => [key, schema.optional()]))).refine((value) => Object.keys(value).length > 0),
});
export const faqIdSchema = z.object({ query: empty, body: empty, params: z.object({ id: z.string().cuid() }) });
