import { prisma } from "../config/prisma.js";
import { BadRequestError, NotFoundError } from "../utils/AppError.js";
import { digest, securityAudit } from "./otpService.js";
import { cancelChatOrder } from "./stockService.js";

const summarySelect = {
  id: true,
  orderNumber: true,
  customerName: true,
  status: true,
  subtotalAmount: true,
  deliveryFeeAmount: true,
  taxAmount: true,
  totalAmount: true,
  createdAt: true,
  items: { select: { id: true, quantity: true } },
};

export async function listSiteOrders({ page, pageSize, status }, actor) {
  const where = status ? { status } : {};
  const [items, total] = await Promise.all([
    prisma.chatOrder.findMany({
      where,
      select: summarySelect,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.chatOrder.count({ where }),
  ]);
  await securityAudit(prisma, "order.site.listed", "site-order-list", {
    actorId: actor.id,
    role: actor.role,
    count: items.length,
    page,
  });
  return {
    items: items.map(({ items: orderItems, ...order }) => ({ ...order, itemCount: orderItems.length })),
    pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
  };
}

export async function getSiteOrder(id, actor) {
  const order = await prisma.chatOrder.findUnique({
    where: { id },
    include: {
      items: {
        orderBy: { id: "asc" },
        include: {
          product: { select: { name: true } },
          parentItem: { select: { productId: true, variantId: true, product: { select: { name: true } } } },
        },
      },
      payments: { select: { id: true, method: true, status: true, amountToman: true, createdAt: true, reviewedAt: true } },
    },
  });
  if (!order) throw new NotFoundError("سفارش پیدا نشد.");

  const isManager = ["ADMIN", "MANAGER"].includes(actor.role);
  if (isManager) {
    await securityAudit(prisma, "order.site.viewed", id, { actorId: actor.id });
  }
  const statusAudit = await prisma.securityAudit.findMany({
    where: { subject: digest(id), action: "order.site.status_changed" },
    orderBy: { createdAt: "asc" },
  });

  const visible = {
    id: order.id,
    orderNumber: order.orderNumber,
    customerName: order.customerName,
    customerPhone: isManager ? order.customerPhone : maskPhone(order.customerPhone),
    customerEmail: isManager ? order.customerEmail : null,
    shippingAddress: isManager ? order.shippingAddress : null,
    status: order.status,
    subtotalAmount: order.subtotalAmount,
    deliveryFeeAmount: order.deliveryFeeAmount,
    taxAmount: order.taxAmount,
    totalAmount: order.totalAmount,
    paymentMethod: order.paymentMethod,
    createdAt: order.createdAt,
    items: order.items.map((item) => ({
      id: item.id,
      productName: item.product.name,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      variantLabel: item.variantLabel,
      parentProductName: item.parentItem?.product.name ?? null,
      selectedOptions: item.selectedOptions,
    })),
    payments: order.payments,
    statusHistory: statusAudit.map((entry) => ({ ...entry.details, createdAt: entry.createdAt })),
  };
  return visible;
}

function maskPhone(value) {
  const phone = String(value ?? "");
  if (phone.length < 7) return "***";
  return `${phone.slice(0, 4)}***${phone.slice(-2)}`;
}

const transitions = {
  CONFIRMED: ["PROCESSING"],
  PAID: ["PROCESSING"],
  PROCESSING: ["SHIPPED"],
  SHIPPED: ["DELIVERED"],
};

export async function updateSiteOrderStatus(id, status, actorId) {
  if (status === "CANCELLED") {
    const cancelled = await cancelChatOrder(id, { actorId });
    return cancelled;
  }

  return prisma.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT id FROM chat_orders WHERE id=${id} FOR UPDATE`;
    const existing = await tx.chatOrder.findUnique({ where: { id } });
    if (!existing) throw new NotFoundError("سفارش پیدا نشد.");
    if (existing.status === status) return existing;
    if (!transitions[existing.status]?.includes(status)) {
      throw new BadRequestError("تغییر وضعیت سفارش با وضعیت فعلی سازگار نیست.");
    }
    const updated = await tx.chatOrder.update({ where: { id }, data: { status } });
    await securityAudit(tx, "order.site.status_changed", id, {
      actorId,
      from: existing.status,
      to: status,
    });
    return updated;
  }, { isolationLevel: "Serializable" });
}
