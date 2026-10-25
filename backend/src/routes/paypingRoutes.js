import { Router } from "express";
import { z } from "zod";
import { validate } from "../middleware/validate.js";
import { chatLimiter } from "../middleware/rateLimiters.js";
import { requireCheckoutProof } from "../controllers/otpController.js";
import { createPayPingRequest, payPingCallback } from "../controllers/paypingController.js";

const router = Router();
router.post(
  "/request",
  chatLimiter,
  requireCheckoutProof,
  validate(z.object({ body: z.object({ orderId: z.string().min(1).max(100) }) })),
  createPayPingRequest,
);
// PayPing may return the browser with POST (form) or GET (query string).
router.post("/callback", payPingCallback);
router.get("/callback", payPingCallback);

export default router;
