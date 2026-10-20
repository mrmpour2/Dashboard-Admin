import { Router } from "express";
import authRoutes from "./authRoutes.js";
import userRoutes from "./userRoutes.js";
import productRoutes from "./productRoutes.js";
import ticketRoutes from "./ticketRoutes.js";
import commentRoutes from "./commentRoutes.js";
import orderRoutes from "./orderRoutes.js";
import couponRoutes from "./couponRoutes.js";
import reviewRoutes from "./reviewRoutes.js";
import publicRoutes from "./publicRoutes.js";
import chatRoutes from "./chatRoutes.js";
import paymentRoutes from "./paymentRoutes.js";
import conversationRoutes from "./conversationRoutes.js";
import { requireAuth } from "../middleware/auth.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { getDashboard } from "../services/dashboardService.js";

const router = Router();

router.get("/health", (_req, res) => {
  res.json({ status: "ok", time: new Date().toISOString() });
});

router.use("/auth", authRoutes);
router.get("/dashboard", requireAuth, asyncHandler(async (_req, res) => res.json(await getDashboard())));
router.use("/users", userRoutes);
router.use("/products", productRoutes);
router.use("/tickets", ticketRoutes);
router.use("/comments", commentRoutes);
router.use("/orders", orderRoutes);
router.use("/coupons", couponRoutes);
// نظرهای مشتریان (پنل مدیریت): تأیید، انتخاب برای Table Talk و حذف.
router.use("/reviews", reviewRoutes);
// مسیرهای عمومی وب‌سایت (بدون توکن) — عمداً جدا از مسیرهای محافظت‌شده پنل
// نگه داشته می‌شوند تا قفل‌شدن API ادمین، منوی عمومی را از کار نیندازد.
router.use("/public", publicRoutes);
router.use("/chat", chatRoutes);
router.use("/conversations", conversationRoutes);
router.use("/payment", paymentRoutes);

export default router;
