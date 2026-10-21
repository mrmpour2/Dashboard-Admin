import { prisma } from "../config/prisma.js";
import { env } from "../config/env.js";
import { AppError, BadRequestError } from "../utils/AppError.js";
import { securityAudit, lockKeys } from "./otpService.js";

export const activeOrderStatuses = ["PENDING_PAYMENT", "RESERVED"];
export function aggregateItems(items) {
  const quantities = new Map();
  for (const item of items) quantities.set(item.productId, (quantities.get(item.productId) || 0) + item.quantity);
  return [...quantities].sort(([a], [b]) => a.localeCompare(b));
}
export async function reserveStock(tx, orderId, items, expiresAt, orderKind = "chat") {
  for (const [skuId, qty] of aggregateItems(items)) {
    const affected = await tx.$executeRaw`UPDATE product_stock SET reserved=reserved+${qty}
      WHERE sku_id=${skuId} AND on_hand-reserved >= ${qty}`;
    if (affected !== 1) throw new AppError("موجودی محصول کافی نیست.", 409, "OUT_OF_STOCK");
    await tx.stockReservation.create({ data: { orderId, orderKind, skuId, qty, expiresAt } });
  }
}
export async function transitionReservations(tx, orderId, status, reason, orderKind = "chat", now = new Date()) {
  const rows = await tx.stockReservation.findMany({ where: { orderId, orderKind, status: "active" }, orderBy: { skuId: "asc" } });
  for (const row of rows) {
    const changed = await tx.stockReservation.updateMany({ where: { id: row.id, status: "active" },
      data: { status, ...(status === "consumed" ? {} : { releasedAt: now, releaseReason: reason }) } });
    if (!changed.count) continue;
    if (status === "consumed") {
      await tx.$executeRaw`UPDATE product_stock SET on_hand=on_hand-${row.qty},reserved=reserved-${row.qty} WHERE sku_id=${row.skuId}`;
    } else {
      await tx.$executeRaw`UPDATE product_stock SET reserved=reserved-${row.qty} WHERE sku_id=${row.skuId}`;
    }
  }
  return rows.length;
}
export async function releaseExpired({ now = new Date(), dryRun = env.STOCK_JOB_DRY_RUN, limit = 500 } = {}) {
  if (dryRun) return { dryRun: true, count: await prisma.stockReservation.count({ where: { status: "active", expiresAt: { lte: now } } }) };
  return prisma.$transaction(async tx => {
    // Always lock order -> reservation -> SKU; skip orders owned by another worker/payment.
    const orders = await tx.$queryRaw`SELECT id FROM chat_orders WHERE status IN ('PENDING_PAYMENT','RESERVED')
      AND "expiresAt" <= ${now} ORDER BY "expiresAt" LIMIT ${limit} FOR UPDATE SKIP LOCKED`;
    let count = 0;
    for (const order of orders) {
      count += await transitionReservations(tx, order.id, "expired", "ttl", "chat", now);
      await tx.chatOrder.update({ where: { id: order.id }, data: { status: "EXPIRED" } });
      await securityAudit(tx, "stock.expired", order.id);
    }
    return { dryRun: false, count };
  }, { timeout: 30000 });
}
export async function enforceGuestLimits(tx, phoneHash, ipHash, now) {
  await lockKeys(tx, [`guest:phone:${phoneHash}`, `guest:ip:${ipHash}`]);
  const identity = { OR: [{ phoneHash }, { ipHash }] };
  const active = await tx.chatOrder.count({ where: { ...identity, status: { in: activeOrderStatuses }, expiresAt: { gt: now } } });
  const hourly = await tx.chatOrder.count({ where: { ...identity, createdAt: { gte: new Date(now.getTime() - 3600000) } } });
  if (active >= 1 || hourly >= 5) {
    throw new AppError("سقف سفارش پرداخت‌نشده یا رزرو ساعتی پر شده است.", 429, "RESERVATION_LIMIT");
  }
}
export async function cancelChatOrder(orderId) {
  return prisma.$transaction(async tx => {
    await tx.$queryRaw`SELECT id FROM chat_orders WHERE id=${orderId} FOR UPDATE`;
    const order = await tx.chatOrder.findUnique({ where: { id: orderId } });
    if (!order) throw new BadRequestError("سفارش پیدا نشد.");
    if (order.status === "CANCELLED") return order;
    if (![...activeOrderStatuses, "EXPIRED"].includes(order.status)) throw new BadRequestError("این سفارش قابل لغو نیست.");
    await transitionReservations(tx, orderId, "released", "user_cancelled");
    return tx.chatOrder.update({ where: { id: orderId }, data: { status: "CANCELLED" } });
  });
}
export async function finalizeVerifiedPayment(tx, payment, { receipt = false, now = new Date() } = {}) {
  await tx.$queryRaw`SELECT id FROM chat_orders WHERE id=${payment.orderId} FOR UPDATE`;
  const order = await tx.chatOrder.findUnique({ where: { id: payment.orderId }, include: { items: true } });
  const current = await tx.chatPayment.findUnique({ where: { id: payment.id } });
  if (["PAID", "REFUND_PENDING", "REFUNDED"].includes(current.status)) return { status: current.status, duplicate: true };
  if (receipt && order.status === "CANCELLED") throw new BadRequestError("سفارش لغو شده است.");
  if (order.expiresAt && order.expiresAt <= now) await transitionReservations(tx, order.id, "expired", "ttl", "chat", now);
  const reservations = await tx.stockReservation.count({ where: { orderId: order.id, orderKind: "chat", status: "active" } });
  let enough = !["CANCELLED", "PAID", "CONFIRMED", "REFUND_PENDING", "REFUNDED"].includes(order.status);
  if (!reservations && enough) {
    // Pre-lock all SKUs to make the availability decision and subsequent reserve atomic.
    for (const [skuId, qty] of aggregateItems(order.items)) {
      const rows = await tx.$queryRaw`SELECT on_hand-reserved AS available FROM product_stock WHERE sku_id=${skuId} FOR UPDATE`;
      if (!rows.length || rows[0].available < qty) enough = false;
    }
    if (enough) await reserveStock(tx, order.id, order.items, new Date(now.getTime() + 60000));
  }
  if (!enough) {
    if (receipt) {
      await tx.chatPayment.update({ where: { id: payment.id }, data: { status: "REJECTED", adminNote: "OUT_OF_STOCK: late receipt requires manual refund/reconciliation" } });
      await tx.securityOutbox.upsert({ where: { key: `ticket:${payment.id}` }, update: {}, create: {
        key: `ticket:${payment.id}`, kind: "ticket", orderId: order.id, paymentId: payment.id, payload: { reason: "late_receipt_out_of_stock" } } });
      return { status: "REJECTED" };
    }
    await tx.chatPayment.update({ where: { id: payment.id }, data: { status: "REFUND_PENDING" } });
    // A second successful payment is refunded without changing the fulfilled sale.
    await tx.chatOrder.updateMany({ where: { id: order.id, status: { in: [...activeOrderStatuses, "EXPIRED", "CANCELLED"] } }, data: { status: "REFUND_PENDING" } });
    for (const kind of ["refund", "notification", "ticket"]) await tx.securityOutbox.upsert({ where: { key: `${kind}:${payment.id}` }, update: {}, create: {
      key: `${kind}:${payment.id}`, kind, orderId: order.id, paymentId: payment.id, payload: { amount: Number(payment.amountToman), reason: "verified_payment_without_stock" } } });
    await securityAudit(tx, "payment.no_stock", order.id, { paymentId: payment.id });
    return { status: "REFUND_PENDING" };
  }
  await transitionReservations(tx, order.id, "consumed", "verified_payment");
  await tx.chatPayment.update({ where: { id: payment.id }, data: { status: "PAID" } });
  await tx.chatOrder.update({ where: { id: order.id }, data: { status: "CONFIRMED" } });
  await securityAudit(tx, "payment.confirmed", order.id, { paymentId: payment.id });
  return { status: "PAID" };
}

// Staff-created orders are explicitly recorded sales, separate from guest payment holds.
export async function recordStaffSale(tx, orderId, items) {
  await reserveStock(tx, orderId, items, new Date(), "admin");
  await transitionReservations(tx, orderId, "consumed", "staff_sale", "admin");
}
export async function reverseStaffSale(tx, orderId, items) {
  const rows = await tx.stockReservation.findMany({ where: { orderId, orderKind: "admin" }, orderBy: { skuId: "asc" } });
  if (!rows.length) {
    // Historical staff sales predate the reservation ledger. The caller locks the
    // order and claims its cancellation once before reaching this compatibility path.
    for (const [skuId, qty] of aggregateItems(items)) await tx.$executeRaw`UPDATE product_stock SET on_hand=on_hand+${qty} WHERE sku_id=${skuId}`;
    return;
  }
  for (const row of rows) {
    const changed = await tx.stockReservation.updateMany({ where: { id: row.id, status: "consumed" },
      data: { status: "released", releasedAt: new Date(), releaseReason: "staff_sale_cancelled" } });
    if (changed.count) await tx.$executeRaw`UPDATE product_stock SET on_hand=on_hand+${row.qty} WHERE sku_id=${row.skuId}`;
  }
}
