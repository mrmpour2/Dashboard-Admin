import { Router } from "express";
import { z } from "zod";
import { validate } from "../middleware/validate.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { chatLimiter } from "../middleware/rateLimiters.js";
import {
  createChatOrder, listChatOrders, createZibalRequest, verifyZibalRequest, zibalCallback,
  getPaymentConfig, submitCardToCardReceipt, listCardToCardReceipts,
  viewCardToCardReceipt, reviewCardToCardReceipt,
} from "../controllers/paymentController.js";

const router = Router();
const empty = z.object({}).optional();
const orderSchema = z.object({ params: empty, query: empty, body: z.object({
  sessionId: z.string().trim().min(20).max(100).regex(/^[\w-]+$/).optional(),
  customerName: z.string().trim().min(2).max(120),
  customerPhone: z.string().trim().min(8).max(20),
  customerEmail: z.string().trim().email().max(254).optional().or(z.literal("")),
  shippingAddress: z.string().trim().min(5).max(2000),
  items: z.array(z.object({
    productId: z.string().min(1).max(100),
    // سایز/واریانت انتخاب‌شده (مثل پیتزای شش‌نفره)؛ اختیاری است.
    variantId: z.string().min(1).max(100).optional(),
    quantity: z.coerce.number().int().min(1).max(50),
    // مخلفات: اشاره به قلم اصلی همین سفارش (شناسه محصول + سایز). سرور بررسی
    // می‌کند که این محصول برای آن قلم در پنل تعریف شده باشد.
    parent: z.object({
      productId: z.string().min(1).max(100),
      variantId: z.string().min(1).max(100).optional(),
    }).optional(),
  })).min(1).max(30),
}) });
const paymentRequestSchema = z.object({ params: empty, query: empty, body: z.object({ orderId: z.string().min(1).max(100) }) });
const verifySchema = z.object({ params: empty, query: empty, body: z.object({ paymentId: z.string().min(1).max(100), trackId: z.union([z.string(), z.number()]) }) });
const receiptSchema = z.object({ params: empty, query: empty, body: z.object({ orderId: z.string().min(1).max(100), imageData: z.string().min(30).max(7_000_000), transferReference: z.string().max(120).optional() }) });
const reviewSchema = z.object({ params: z.object({ paymentId: z.string().min(1).max(100) }), query: empty, body: z.object({ decision: z.enum(["approve", "reject"]), note: z.string().max(1000).optional() }) });

router.get("/config", getPaymentConfig);
router.get("/orders", requireAuth, requireRole("ADMIN", "MANAGER"), listChatOrders);
router.post("/orders", chatLimiter, validate(orderSchema), createChatOrder);
router.post("/zibal/request", chatLimiter, validate(paymentRequestSchema), createZibalRequest);
router.post("/zibal/verify", chatLimiter, validate(verifySchema), verifyZibalRequest);
router.get("/zibal/callback", zibalCallback);
router.post("/card-to-card/submit", chatLimiter, validate(receiptSchema), submitCardToCardReceipt);

// فقط مدیر و مدیر فروش می‌توانند رسیدها را مشاهده یا تأیید کنند.
router.get("/card-to-card/receipts", requireAuth, requireRole("ADMIN", "MANAGER"), listCardToCardReceipts);
router.get("/card-to-card/receipts/:paymentId/image", requireAuth, requireRole("ADMIN", "MANAGER"), viewCardToCardReceipt);
router.patch("/card-to-card/receipts/:paymentId/review", requireAuth, requireRole("ADMIN", "MANAGER"), validate(reviewSchema), reviewCardToCardReceipt);
export default router;
