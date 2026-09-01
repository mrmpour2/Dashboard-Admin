import { Router } from "express";
import * as userController from "../controllers/userController.js";
import { validate } from "../middleware/validate.js";
import {
  listUsersSchema,
  userIdParamSchema,
  updateUserSchema,
} from "../validators/userValidators.js";
import { requireAuth, requireRole } from "../middleware/auth.js";

const router = Router();

// همه مسیرهای این فایل نیازمند احراز هویت هستند
router.use(requireAuth);

router.get("/", validate(listUsersSchema), userController.listUsers);
router.get("/:id", validate(userIdParamSchema), userController.getUser);

// فقط ADMIN و MANAGER اجازه ویرایش/حذف کاربران را دارند
router.patch(
  "/:id",
  requireRole("ADMIN", "MANAGER"),
  validate(updateUserSchema),
  userController.updateUser,
);
router.delete(
  "/:id",
  requireRole("ADMIN"),
  validate(userIdParamSchema),
  userController.deleteUser,
);

export default router;
