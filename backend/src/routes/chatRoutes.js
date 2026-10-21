import { Router } from "express";
import { chat, getConversation } from "../controllers/chatController.js";
import { chatLimiter } from "../middleware/rateLimiters.js";
import { validate } from "../middleware/validate.js";
import { chatRequestSchema } from "../validators/publicValidators.js";

const router = Router();

// تاریخچه با شناسه نشست تصادفی؛ فقط داده همان نشست برگردانده می‌شود.
router.get("/conversations/:sessionId", getConversation);

// دستیار گفتگو: بدون توکن اما با محدودیت نرخ، چون هر درخواست به مدل زبانی می‌رود.
router.post("/", chatLimiter, validate(chatRequestSchema), chat);

export default router;
