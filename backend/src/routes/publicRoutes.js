import { Router } from "express";
import { getMenuItem, getMenuItemAddOns, listMenu } from "../controllers/publicMenuController.js";
import {
  createPublicReview,
  listPublicReviews,
  listTableTalk,
} from "../controllers/reviewController.js";
import { optionalClubMember } from "../middleware/clubAuth.js";
import { reviewSubmitLimiter } from "../middleware/rateLimiters.js";
import { validate } from "../middleware/validate.js";
import clubRoutes from "./clubRoutes.js";
import { listPublicMenuSchema, publicMenuItemSchema } from "../validators/publicValidators.js";
import {
  createPublicReviewSchema,
  listPublicReviewsSchema,
  listTableTalkSchema,
} from "../validators/reviewValidators.js";

const router = Router();

// منوی عمومی وب‌سایت: بدون توکن، فقط خواندنی و با پاسخ کش‌شدنی.
router.get("/menu", validate(listPublicMenuSchema), listMenu);
router.get("/menu/:id", validate(publicMenuItemSchema), getMenuItem);
// مخلفات پیشنهادی یک غذا (نوشیدنی/ساید) برای پنل تکمیل سفارش.
router.get("/menu/:id/addons", validate(publicMenuItemSchema), getMenuItemAddOns);

// باشگاه مشتریان: کاتالوگ، عضویت، ورود، حساب و استرداد پاداش.
router.use("/club", clubRoutes);

// نظرهای مشتریان: خواندن آزاد و ثبت با نرخ‌محدودی (جلوگیری از اسپم).
router.get("/reviews", validate(listPublicReviewsSchema), listPublicReviews);
// کوکی باشگاه اختیاری است: مهمان بدون ورود هم می‌تواند نظر بدهد، ولی اگر عضو
// باشد امتیاز نظر به حساب همان عضو اضافه می‌شود.
router.post(
  "/reviews",
  reviewSubmitLimiter,
  optionalClubMember,
  validate(createPublicReviewSchema),
  createPublicReview,
);

// بخش «Table Talk» صفحهٔ اصلی: فقط نظرهای تأییدشده و انتخاب‌شدهٔ مدیر.
router.get("/testimonials", validate(listTableTalkSchema), listTableTalk);

export default router;

