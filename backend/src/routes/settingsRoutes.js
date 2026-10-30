import { Router } from "express";
import { z } from "zod";
import * as controller from "../controllers/settingsController.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";

const router = Router();
const mobile = z.string().trim().min(8).max(20).regex(/^[+\d۰-۹٠-٩()\-\s]+$/);

router.use(requireAuth, requireRole("ADMIN", "MANAGER"));
router.get("/order-alert-phones", controller.getOrderAlertSettings);
router.put("/order-alert-phones", validate(z.object({
  params: z.object({}).optional(),
  query: z.object({}).optional(),
  body: z.object({ phones: z.array(mobile).max(20) }),
})), controller.updateOrderAlertSettings);

export default router;
