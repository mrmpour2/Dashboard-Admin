import { prisma } from "../config/prisma.js";
import { digest, normalizeMobile, securityAudit } from "./otpService.js";

export const ORDER_ALERT_PHONES_KEY = "order_alert_phones";

function normalizeRecipients(value) {
  if (!Array.isArray(value)) return [];
  const result = new Set();
  for (const entry of value) {
    try {
      result.add(normalizeMobile(entry));
    } catch {
      // Invalid values are ignored here; the settings API rejects them on write.
    }
  }
  return [...result];
}

function buildOrderMessage(order) {
  const lines = (order.items ?? []).slice(0, 3).map((item) => `${item.product?.name ?? "محصول"}×${item.quantity}`);
  const more = (order.items?.length ?? 0) > 3 ? " و موارد دیگر" : "";
  return `سفارش ${order.orderNumber} | مبلغ ${Number(order.totalAmount).toLocaleString("fa-IR")} تومان | ${lines.join("، ")}${more}`.slice(0, 500);
}

/** Queue one idempotent SMS outbox event per configured manager recipient. */
export async function queueOrderAdminSms(tx, orderId) {
  const setting = await tx.appSetting.findUnique({ where: { key: ORDER_ALERT_PHONES_KEY } });
  const recipients = normalizeRecipients(setting?.value);
  if (!recipients.length) return 0;

  const order = await tx.chatOrder.findUnique({
    where: { id: orderId },
    include: { items: { include: { product: { select: { name: true } } } } },
  });
  if (!order) return 0;

  const message = buildOrderMessage(order);
  for (const phone of recipients) {
    const key = `order-alert:${order.id}:${digest(phone)}`;
    await tx.securityOutbox.upsert({
      where: { key },
      update: {},
      create: {
        key,
        kind: "sms",
        orderId: order.id,
        payload: { type: "order_created", phone, message },
      },
    });
  }
  await securityAudit(tx, "order.alert.queued", order.id, { recipientCount: recipients.length });
  return recipients.length;
}

export async function getOrderAlertPhones() {
  const setting = await prisma.appSetting.findUnique({ where: { key: ORDER_ALERT_PHONES_KEY } });
  return normalizeRecipients(setting?.value);
}

export async function setOrderAlertPhones(phones, actorId) {
  const normalized = [...new Set(phones.map(normalizeMobile))];
  await prisma.$transaction(async (tx) => {
    await tx.appSetting.upsert({
      where: { key: ORDER_ALERT_PHONES_KEY },
      update: { value: normalized, updatedById: actorId },
      create: { key: ORDER_ALERT_PHONES_KEY, value: normalized, updatedById: actorId },
    });
    await securityAudit(tx, "settings.order_alert_phones.updated", actorId, { recipientCount: normalized.length });
  });
  return normalized;
}
