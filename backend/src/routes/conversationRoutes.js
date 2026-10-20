import { Router } from "express";
import { getConversation } from "../controllers/chatController.js";
const router = Router();
router.get("/:sessionId", getConversation);
export default router;
