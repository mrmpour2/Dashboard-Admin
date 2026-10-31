import { Router } from "express";
import crypto from "node:crypto";
import { z } from "zod";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { prisma } from "../config/prisma.js";
import { normalizeMobile, securityAudit } from "../services/otpService.js";
import { adjustClubPoints, exportClubMembers, exportNonMembers, getClubMember, listClubMembers, listNonMembers, setMarketingConsent } from "../services/clubAdminService.js";
import { BadRequestError } from "../utils/AppError.js";
import { validate } from "../middleware/validate.js";

const router = Router();
router.use(requireAuth, requireRole("ADMIN", "MANAGER"));
const querySchema = z.object({ page: z.coerce.number().int().min(1).default(1), pageSize: z.coerce.number().int().min(1).max(100).default(20), search: z.string().max(100).optional(), consent: z.enum(["true", "false"]).optional(), tier: z.enum(["bronze", "silver", "gold"]).optional() });
const idParams = z.object({ id: z.string().min(1).max(100) });
const pointsBody = z.object({ delta: z.number().int().min(-100000).max(100000).refine(x => x !== 0), reason: z.string().trim().min(5).max(500) });
const consentBody = z.object({ allowed: z.boolean() });
const couponBody = z.object({ discountType: z.enum(["PERCENTAGE", "FIXED_AMOUNT"]), discountValue: z.number().positive(), maxDiscountAmount: z.number().positive().optional(), expiresAt: z.coerce.date(), reason: z.string().trim().min(5).max(500) });
const smsBody = z.object({ memberIds: z.array(z.string().min(1)).min(1).max(500), message: z.string().trim().min(1).max(1000), idempotencyKey: z.string().min(8).max(100) });
router.get("/members", validate(z.object({ query: querySchema })), asyncHandler(async (req, res) => {
  const q = req.query;
  res.json(await listClubMembers({ ...q, consent: q.consent === undefined ? undefined : q.consent === "true", actor: req.user }));
}));
router.get("/members/export.xlsx", validate(z.object({ query: querySchema.omit({ page: true, pageSize: true }) })), asyncHandler(async (req, res) => {
  const q = req.query;
  const buffer = await exportClubMembers({ ...q, consent: q.consent === undefined ? undefined : q.consent === "true" }, req.user);
  res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
  res.setHeader("Content-Disposition", "attachment; filename=club-members.xlsx");
  res.send(Buffer.from(buffer));
}));
router.get("/nonmembers", validate(z.object({ query: querySchema.omit({ tier: true }) })), asyncHandler(async (req, res) => {
  const q = req.query;
  res.json(await listNonMembers({ ...q, consent: q.consent === undefined ? undefined : q.consent === "true", actor: req.user }));
}));
router.get("/nonmembers/export.xlsx", validate(z.object({ query: querySchema.omit({ page: true, pageSize: true, tier: true }) })), asyncHandler(async (req, res) => {
  const q = req.query;
  const buffer = await exportNonMembers({ ...q, consent: q.consent === undefined ? undefined : q.consent === "true" }, req.user);
  res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
  res.setHeader("Content-Disposition", "attachment; filename=club-nonmembers.xlsx");
  res.send(Buffer.from(buffer));
}));
router.get("/members/:id", validate(z.object({ params: idParams })), asyncHandler(async (req, res) => res.json(await getClubMember(req.params.id, req.user))));
router.post("/members/:id/points", validate(z.object({ params: idParams, body: pointsBody })), asyncHandler(async (req, res) => {
  const body = req.body;
  res.status(201).json(await adjustClubPoints(req.params.id, body.delta, body.reason, req.user));
}));
router.patch("/members/:id/consent", validate(z.object({ params: idParams, body: consentBody })), asyncHandler(async (req, res) => {
  const body = req.body;
  if (body.allowed) throw new BadRequestError("رضایت تبلیغاتی باید مستقیماً توسط خود مشتری ثبت شود");
  res.json(await setMarketingConsent(req.params.id, body.allowed, req.user));
}));
router.post("/members/:id/coupons", validate(z.object({ params: idParams, body: couponBody })), asyncHandler(async (req, res) => {
  const body = req.body;
  if (body.discountType === "PERCENTAGE" && body.discountValue > 100) throw new BadRequestError("درصد باید حداکثر ۱۰۰ باشد");
  const member = await prisma.clubMember.findUnique({ where: { id: req.params.id }, select: { id: true, isActive: true } });
  if (!member?.isActive) throw new BadRequestError("عضو فعال پیدا نشد");
  const code = `CLUB-${crypto.randomBytes(6).toString("hex").toUpperCase()}`;
  const coupon = await prisma.coupon.create({ data: { ...body, code, maxUses: 1, clubMemberId: member.id } });
  await securityAudit(prisma, "club.coupon.issued", member.id, { actorId: req.user.id, couponId: coupon.id, discountType: body.discountType, reason: body.reason });
  res.status(201).json({ code: coupon.code, discountType: coupon.discountType, discountValue: coupon.discountValue, expiresAt: coupon.expiresAt });
}));
router.post("/sms", validate(z.object({ body: smsBody })), asyncHandler(async (req, res) => {
  const body = req.body;
  const members = await prisma.clubMember.findMany({ where: { id: { in: body.memberIds }, isActive: true, marketingConsent: true }, select: { id: true, phone: true } });
  const requested = new Set(body.memberIds);
  if (members.length !== requested.size) throw new BadRequestError("همهٔ اعضای انتخاب‌شده رضایت معتبر پیام تبلیغاتی ندارند");
  await prisma.$transaction(async tx => {
    for (const member of members) await tx.securityOutbox.upsert({ where: { key: `${body.idempotencyKey}:${member.id}` }, create: { key: `${body.idempotencyKey}:${member.id}`, kind: "sms", orderId: `club:${member.id}`, payload: { phone: normalizeMobile(member.phone), message: body.message, category: "marketing", memberId: member.id } }, update: {} });
    await securityAudit(tx, "club.marketing_sms.queued", body.idempotencyKey, { actorId: req.user.id, recipientCount: members.length });
  });
  res.status(202).json({ queued: members.length });
}));
export default router;
