import { Router } from "express";
import { join, login, logout, me, redeem, rewards } from "../controllers/clubController.js";
import { requireClubMember } from "../middleware/clubAuth.js";
import { authLimiter, clubRedeemLimiter } from "../middleware/rateLimiters.js";
import { validate } from "../middleware/validate.js";
import {
  clubEmptySchema,
  joinClubSchema,
  loginClubSchema,
  redeemClubRewardSchema,
} from "../validators/clubValidators.js";

const router = Router();

// کاتالوگ پاداش‌ها عمومی است تا صفحهٔ باشگاه حتی پیش از ورود هم محتوای واقعی
// داشته باشد؛ شرایط دریافت فقط با حساب عضو محاسبه می‌شود.
router.get("/rewards", validate(clubEmptySchema), rewards);

// عضویت و ورود با محدودیت نرخ؛ کوکی HttpOnly در کنترلر تنظیم می‌شود.
router.post("/join", authLimiter, validate(joinClubSchema), join);
router.post("/login", authLimiter, validate(loginClubSchema), login);
router.post("/logout", validate(clubEmptySchema), logout);

router.get("/me", requireClubMember, me);
router.post(
  "/rewards/:rewardId/redeem",
  requireClubMember,
  clubRedeemLimiter,
  validate(redeemClubRewardSchema),
  redeem,
);

export default router;
