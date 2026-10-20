import { Router } from "express";
import * as orderController from "../controllers/orderController.js";
import { validate } from "../middleware/validate.js";
import {
  listOrdersSchema,
  orderIdParamSchema,
  createOrderSchema,
  updateOrderStatusSchema,
} from "../validators/orderValidators.js";
import { requireAuth, requireRole } from "../middleware/auth.js";

const router = Router();

// همه مسیرها نیازمند لاگین هستند
router.use(requireAuth);

router.get("/", validate(listOrdersSchema), orderController.listOrders);
router.get("/:id", validate(orderIdParamSchema), orderController.getOrder);

// ثبت سفارش با اعتبارسنجی ورودی
router.post(
  "/",
  requireRole("ADMIN", "MANAGER"),
  validate(createOrderSchema),
  orderController.createOrder
);

// فقط ادمین و مدیر اجازه تغییر وضعیت سفارش را دارند
router.patch(
  "/:id/status",
  requireRole("ADMIN", "MANAGER"),
  validate(updateOrderStatusSchema),
  orderController.updateOrderStatus
);

export default router;
