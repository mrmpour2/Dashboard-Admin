import { asyncHandler } from "../utils/asyncHandler.js";
import * as faqService from "../services/faqService.js";

export const listPublicFaq = asyncHandler(async (_req, res) => {
  res.setHeader("Cache-Control", "public, max-age=60, stale-while-revalidate=300");
  res.json({ items: await faqService.listPublicFaq() });
});

export const listAdminFaq = asyncHandler(async (_req, res) => {
  res.setHeader("Cache-Control", "no-store");
  res.json({ items: await faqService.listAdminFaq() });
});

export const createFaq = asyncHandler(async (req, res) => {
  res.status(201).json({ item: await faqService.createFaq(req.body, req.user.id) });
});

export const updateFaq = asyncHandler(async (req, res) => {
  res.json({ item: await faqService.updateFaq(req.params.id, req.body, req.user.id) });
});
