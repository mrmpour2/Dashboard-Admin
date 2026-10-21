import { Router } from "express";
import * as couponController from "../controllers/couponController.js";
import { validate } from "../middleware/validate.js";
import {
  listCouponsSchema,
  couponIdParamSchema,
  createCouponSchema,
  updateCouponSchema,
} from "../validators/couponValidators.js";
import { requireAuth, requireRole } from "../middleware/auth.js";

const router = Router();

router.use(requireAuth);

router.get("/", validate(listCouponsSchema), couponController.listCoupons);
router.get("/:id", validate(couponIdParamSchema), couponController.getCoupon);

// فقط ADMIN/MANAGER اجازه ساخت/ویرایش/حذف کدهای تخفیف را دارند
router.post(
  "/",
  requireRole("ADMIN", "MANAGER"),
  validate(createCouponSchema),
  couponController.createCoupon,
);
router.patch(
  "/:id",
  requireRole("ADMIN", "MANAGER"),
  validate(updateCouponSchema),
  couponController.updateCoupon,
);
router.delete(
  "/:id",
  requireRole("ADMIN"),
  validate(couponIdParamSchema),
  couponController.deleteCoupon,
);

export default router;
