import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import {
  listReviewsSchema,
  reviewIdParamSchema,
  updateReviewSchema,
} from "../validators/reviewValidators.js";
import * as reviewController from "../controllers/reviewController.js";

/**
 * مسیرهای مدیریت نظرهای مشتریان (پنل ادمین).
 *
 * این مسیرها پشت `requireAuth` هستند و همهٔ نظرها را با وضعیت‌شان برمی‌گردانند.
 * مسیرهای عمومی سایت (`/api/public/reviews` و `/api/public/testimonials`) عمداً
 * جدا هستند تا قفل‌شدن API ادمین، نظرهای صفحهٔ محصول و Table Talk را از کار
 * نیندازد.
 */
const router = Router();

router.use(requireAuth);
router.get("/", validate(listReviewsSchema), reviewController.listReviews);
router.patch("/:id", validate(updateReviewSchema), reviewController.updateReview);
router.delete("/:id", validate(reviewIdParamSchema), reviewController.deleteReview);

export default router;
