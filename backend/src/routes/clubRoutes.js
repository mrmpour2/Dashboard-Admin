import { Router } from "express";
import { join, login, logout, me, redeem, rewards, verifyClaim, resendClaim } from "../controllers/clubController.js";
import { clawbackClubPoints } from "../services/clubOwnershipService.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { z } from "zod";
import { requireClubMember } from "../middleware/clubAuth.js";
import { setMarketingConsent } from "../services/clubAdminService.js";
import { prisma } from "../config/prisma.js";
import { digest, securityAudit } from "../services/otpService.js";
import { authLimiter, clubRedeemLimiter } from "../middleware/rateLimiters.js";
import { validate } from "../middleware/validate.js";
import {
  clubEmptySchema,
  joinClubSchema,
  loginClubSchema,
  redeemClubRewardSchema,
  verifyClubClaimSchema,
  resendClubClaimSchema,
} from "../validators/clubValidators.js";

const router = Router();
router.post("/points/:id/clawback", requireAuth, requireRole("ADMIN", "MANAGER"), validate(z.object({ params: z.object({ id: z.string().max(100) }), body: z.object({ reason: z.string().trim().min(5).max(500) }) })), async (req, res, next) => {
  try { res.json(await clawbackClubPoints({ accrualId: req.params.id, reason: req.body.reason, actorId: req.user.id })); } catch(error) { next(error); }
});

// کاتالوگ پاداش‌ها عمومی است تا صفحهٔ باشگاه حتی پیش از ورود هم محتوای واقعی
// داشته باشد؛ شرایط دریافت فقط با حساب عضو محاسبه می‌شود.
router.get("/rewards", validate(clubEmptySchema), rewards);

// عضویت و ورود با محدودیت نرخ؛ کوکی HttpOnly در کنترلر تنظیم می‌شود.
router.post("/join", authLimiter, validate(joinClubSchema), join);
router.post("/claims/verify", authLimiter, validate(verifyClubClaimSchema), verifyClaim);
router.post("/claims/resend", authLimiter, validate(resendClubClaimSchema), resendClaim);
router.post("/login", authLimiter, validate(loginClubSchema), login);
router.post("/logout", validate(clubEmptySchema), logout);

router.get("/me", requireClubMember, me);
router.patch("/me/marketing-consent", requireClubMember, async (req, res, next) => {
  try { const body = z.object({ allowed: z.boolean() }).parse(req.body); res.json(await setMarketingConsent(req.clubMember.id, body.allowed, { id: req.clubMember.id, role: "MEMBER" }, "member_settings")); } catch (error) { next(error); }
});
router.delete("/me", requireClubMember, async (req, res, next) => {
  try {
    const member = req.clubMember;
    await prisma.$transaction(async tx => {
      await tx.clubMember.update({ where: { id: member.id }, data: { isActive: false, marketingConsent: false, tokenVersion: { increment: 1 } } });
      await tx.clubClaim.updateMany({ where: { memberId: member.id, status: "verified" }, data: { status: "cancelled" } });
      await tx.customerMarketingConsent.upsert({ where: { phoneHash: digest(member.phone) }, create: { phoneHash: digest(member.phone), marketingAllowed: false, source: "member_cancellation" }, update: { marketingAllowed: false, consentAt: null, source: "member_cancellation" } });
      await securityAudit(tx, "club.membership.cancelled", member.id, { memberId: member.id });
    });
    res.status(204).end();
  } catch (error) { next(error); }
});
router.post(
  "/rewards/:rewardId/redeem",
  requireClubMember,
  clubRedeemLimiter,
  validate(redeemClubRewardSchema),
  redeem,
);

export default router;
