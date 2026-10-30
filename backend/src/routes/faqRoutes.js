import { Router } from "express";
import * as controller from "../controllers/faqController.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import { createFaqSchema, updateFaqSchema } from "../validators/faqValidators.js";

const router = Router();
router.use(requireAuth, requireRole("ADMIN", "MANAGER"));
router.get("/", controller.listAdminFaq);
router.post("/", validate(createFaqSchema), controller.createFaq);
router.patch("/:id", validate(updateFaqSchema), controller.updateFaq);
export default router;
