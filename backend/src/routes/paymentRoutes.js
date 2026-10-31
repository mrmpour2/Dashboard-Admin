import { stockMetrics } from "../services/securityJobs.js";
import { sendCheckoutOtp, verifyCheckoutOtp, requireCheckoutProof } from "../controllers/otpController.js";
import { readGuestOrder, cancelGuestOrder, confirmCashOnDelivery } from "../controllers/paymentController.js";
import { Router } from "express";
import { z } from "zod";
import { validate } from "../middleware/validate.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { checkoutLimiter } from "../middleware/rateLimiters.js";
import {
  createChatOrder, listChatOrders, getPaymentConfig,
} from "../controllers/paymentController.js";

const router = Router();
const empty = z.object({}).optional();
const orderSchema = z.object({ params: empty, query: empty, body: z.object({
  sessionId: z.string().trim().min(20).max(100).regex(/^[\w-]+$/).optional(),
  customerName: z.string().trim().min(2).max(120),
  customerPhone: z.string().trim().min(8).max(20),
  marketingConsent: z.boolean().optional().default(false),
  couponCode: z.string().trim().max(40).optional(),
  customerEmail: z.string().trim().email().max(254).optional().or(z.literal("")),
  shippingAddress: z.string().trim().min(5).max(2000),
  items: z.array(z.object({
    productId: z.string().min(1).max(100),
    // سایز/واریانت انتخاب‌شده (مثل پیتزای شش‌نفره)؛ اختیاری است.
    variantId: z.string().min(1).max(100).optional(),
    selectedOptionIds: z.array(z.string().cuid()).max(12).refine((ids) => new Set(ids).size === ids.length).optional(),
    quantity: z.coerce.number().int().min(1).max(50),
    // مخلفات: اشاره به قلم اصلی همین سفارش (شناسه محصول + سایز). سرور بررسی
    // می‌کند که این محصول برای آن قلم در پنل تعریف شده باشد.
    parent: z.object({
      productId: z.string().min(1).max(100),
      variantId: z.string().min(1).max(100).optional(),
    }).optional(),
  })).min(1).max(30),
}) });

router.post("/otp/request", checkoutLimiter, validate(z.object({ body: z.object({ phone: z.string().max(20), captchaToken: z.string().max(2048).optional() }) })), sendCheckoutOtp);
router.post("/otp/verify", checkoutLimiter, validate(z.object({ body: z.object({ phone: z.string().max(20), challengeId: z.string().max(100), code: z.string().regex(/^\d{6}$/), captchaToken: z.string().max(2048).optional() }) })), verifyCheckoutOtp);
router.get("/orders/:orderId", checkoutLimiter, requireCheckoutProof, readGuestOrder);
router.post("/orders/:orderId/cancel", checkoutLimiter, requireCheckoutProof, cancelGuestOrder);
router.post("/orders/:orderId/confirm-cod", checkoutLimiter, requireCheckoutProof, confirmCashOnDelivery);
router.get("/stock-metrics", requireAuth, requireRole("ADMIN", "MANAGER"), async (_req, res, next) => { try { res.json(await stockMetrics()); } catch(error) { next(error); } });
router.get("/config", getPaymentConfig);
router.get("/orders", requireAuth, requireRole("ADMIN", "MANAGER"), listChatOrders);
router.post("/orders", checkoutLimiter, requireCheckoutProof, validate(orderSchema), createChatOrder);
export default router;
