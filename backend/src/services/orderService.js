import { recordStaffSale, reverseStaffSale } from "./stockService.js";
import crypto from "node:crypto";
import { prisma } from "../config/prisma.js";
import { NotFoundError, BadRequestError } from "../utils/AppError.js";
import { resolveCouponForOrder } from "./couponService.js";

const customerSelect = { id: true, name: true, email: true, avatarUrl: true };
const orderInclude = {
  customer: { select: customerSelect },
  coupon: { select: { id: true, code: true, discountType: true, discountValue: true } },
  items: {
    include: {
      product: { select: { id: true, name: true, imageUrl: true } },
    },
  },
};

function generateOrderNumber() {
  // یک شناسه خوانا و به‌اندازه کافی یکتا برای نمایش به کاربر (نه شناسه داخلی cuid)
  const random = crypto.randomBytes(3).toString("hex").toUpperCase();
  return `ORD-${Date.now().toString(36).toUpperCase()}-${random}`;
}

export async function listOrders({ page, pageSize, status, customerId }) {
  const where = {
    ...(status && { status }),
    ...(customerId && { customerId }),
  };

  const [items, total] = await Promise.all([
    prisma.order.findMany({
      where,
      include: orderInclude,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.order.count({ where }),
  ]);

  return {
    items,
    pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
  };
}

export async function getOrderById(id) {
  const order = await prisma.order.findUnique({ where: { id }, include: orderInclude });
  if (!order) throw new NotFoundError("سفارش یافت نشد");
  return order;
}

export async function createOrder({ customerId, items, couponCode }) {
  const customer = await prisma.user.findUnique({ where: { id: customerId } });
  if (!customer) throw new BadRequestError("مشتری انتخاب‌شده یافت نشد");

  const productIds = [...new Set(items.map((item) => item.productId))];
  const products = await prisma.product.findMany({ where: { id: { in: productIds } } });
  const productMap = new Map(products.map((p) => [p.id, p]));

  // بررسی موجودی هر قلم پیش از هر تغییری در دیتابیس
  for (const item of items) {
    const product = productMap.get(item.productId);
    if (!product) {
      throw new BadRequestError(`محصولی با شناسه ${item.productId} یافت نشد`);
    }
    if (!product.isActive) {
      throw new BadRequestError(`محصول «${product.name}» غیرفعال است`);
    }
    if (product.stock < item.quantity) {
      throw new BadRequestError(
        `موجودی «${product.name}» کافی نیست (موجودی: ${product.stock}، درخواست: ${item.quantity})`,
      );
    }
  }

  const subtotalAmount = items.reduce((sum, item) => {
    const product = productMap.get(item.productId);
    return sum + Number(product.price) * item.quantity;
  }, 0);

  // تراکنش اتمیک: ساخت سفارش + کسر موجودی + اعمال کد تخفیف، یا هیچ‌کدام
  // (جلوگیری از ناسازگاری داده در صورت خطای نیمه‌راه)
  const order = await prisma.$transaction(async (tx) => {
    let couponId = null;
    let discountAmount = 0;

    if (couponCode) {
      const resolved = await resolveCouponForOrder(couponCode, subtotalAmount, tx);
      couponId = resolved.coupon.id;
      discountAmount = resolved.discountAmount;
      await tx.coupon.update({
        where: { id: couponId },
        data: { usedCount: { increment: 1 } },
      });
    }

    const totalAmount = subtotalAmount - discountAmount;

    const created = await tx.order.create({
      data: {
        orderNumber: generateOrderNumber(),
        customerId,
        subtotalAmount,
        discountAmount,
        totalAmount,
        couponId,
        items: {
          create: items.map((item) => ({
            productId: item.productId,
            quantity: item.quantity,
            unitPrice: productMap.get(item.productId).price,
          })),
        },
      },
      include: orderInclude,
    });

    await recordStaffSale(tx, created.id, items);

    return created;
  }, { isolationLevel: "Serializable" });

  return order;
}

export async function updateOrderStatus(id, status) {
  const order = await prisma.$transaction(async (tx) => {
    const existing = await tx.order.findUnique({ where: { id }, include: { items: true } });
    if (!existing) throw new NotFoundError("سفارش یافت نشد");
    if (existing.status === "CANCELLED" && status !== "CANCELLED") throw new BadRequestError("سفارش لغوشده قابل بازگشایی نیست");
    const isNewlyCancelled = status === "CANCELLED" && existing.status !== "CANCELLED";
    // اگر سفارش لغو می‌شود، موجودی محصولات به انبار بازگردانده می‌شود
    // و اگر کد تخفیفی روی آن اعمال شده بود، شمارش استفاده از آن هم برمی‌گردد
    if (isNewlyCancelled) {
      await reverseStaffSale(tx, existing.id, existing.items);
      if (existing.couponId) {
        await tx.coupon.update({
          where: { id: existing.couponId },
          data: { usedCount: { decrement: 1 } },
        });
      }
    }

    return tx.order.update({
      where: { id },
      data: { status },
      include: orderInclude,
    });
  }, { isolationLevel: "Serializable" });

  return order;
}
