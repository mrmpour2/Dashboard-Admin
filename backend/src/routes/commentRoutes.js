import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import { listCommentsSchema } from "../validators/commentValidators.js";
import * as commentController from "../controllers/commentController.js";
const router=Router();
router.use(requireAuth);
router.get("/",validate(listCommentsSchema),commentController.listComments);
export default router;
