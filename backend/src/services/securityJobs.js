import { setInterval, clearInterval } from "node:timers";
import { prisma } from "../config/prisma.js";
import { env } from "../config/env.js";
import { logger } from "../config/logger.js";
import { releaseExpired } from "./stockService.js";
import { securityProviders } from "./securityProviders.js";
import { securityAudit } from "./otpService.js";

export async function processSecurityOutbox({ dryRun = env.STOCK_JOB_DRY_RUN } = {}) {
  if (dryRun) return { dryRun: true, count: await prisma.securityOutbox.count({ where: { status: "pending" } }) };
  let count = 0;
  for (let i = 0; i < 20; i++) {
    const processed = await prisma.$transaction(async tx => {
      const rows = await tx.$queryRaw`SELECT id FROM security_outbox WHERE status='pending' ORDER BY attempts,created_at LIMIT 1 FOR UPDATE SKIP LOCKED`;
      if (!rows.length) return false;
      const event = await tx.securityOutbox.findUnique({ where: { id: rows[0].id } });
      try {
        if (event.kind === "refund") {
          const result = await securityProviders.refund({ ...event.payload, idempotencyKey: event.key, orderId: event.orderId, paymentId: event.paymentId });
          if (!result?.reference) throw new Error("Provider must confirm refund reference");
          await tx.chatPayment.update({ where: { id: event.paymentId }, data: { status: "REFUNDED" } });
          await tx.chatOrder.updateMany({ where: { id: event.orderId, status: "REFUND_PENDING" }, data: { status: "REFUNDED" } });
        } else if (event.kind === "ticket") {
          await tx.ticket.upsert({ where: { id: `SEC-${event.id}` }, update: {}, create: { id: `SEC-${event.id}`, title: "بررسی پرداخت و موجودی", description: JSON.stringify({ orderId: event.orderId, paymentId: event.paymentId, ...event.payload }), priority: "HIGH" } });
        } else await securityProviders.notify({ ...event.payload, idempotencyKey: event.key, orderId: event.orderId });
        await tx.securityOutbox.update({ where: { id: event.id }, data: { status: "completed", completedAt: new Date(), attempts: { increment: 1 } } });
        await securityAudit(tx, `outbox.${event.kind}.completed`, event.orderId);
      } catch {
        await tx.securityOutbox.update({ where: { id: event.id }, data: { attempts: { increment: 1 } } });
        await securityAudit(tx, `outbox.${event.kind}.failed`, event.orderId);
        logger.warn({ eventId: event.id, kind: event.kind }, "Security delivery pending; provider unavailable");
      }
      return true;
    }, { timeout: 30000 });
    if (!processed) break;
    count++;
  }
  return { dryRun: false, count };
}
export async function stockMetrics() {
  const [disputed, pendingPoints, otpAlerts] = await Promise.all([
    prisma.clubClaim.count({ where: { status: "disputed" } }),
    prisma.clubPointAccrual.aggregate({ where: { status: "pending" }, _sum: { points: true } }),
    prisma.securityOutbox.count({ where: { key: { startsWith: "otp-alert:" }, status: "pending" } }),
  ]);
  const [created, expired, conflicts, noStock, active, pendingDeliveries, reconciliation] = await Promise.all([
    prisma.stockReservation.count(), prisma.stockReservation.count({ where: { status: "expired" } }),
    prisma.securityAudit.count({ where: { action: "stock.conflict" } }),
    prisma.securityAudit.count({ where: { action: "payment.no_stock" } }),
    prisma.chatOrder.groupBy({ by: ["phoneHash", "ipHash"], where: { status: "RESERVED" }, _count: true }),
    prisma.securityOutbox.count({ where: { status: "pending" } }),
    prisma.$queryRaw`SELECT s.sku_id, s.on_hand, s.reserved, p.stock AS available,
      COALESCE(SUM(r.qty),0)::int AS ledger_reserved FROM product_stock s JOIN products p ON p.id=s.sku_id
      LEFT JOIN stock_reservations r ON r.sku_id=s.sku_id AND r.status='active'
      GROUP BY s.sku_id,s.on_hand,s.reserved,p.stock`,
  ]);
  return { created, expired, expiredRate: created ? expired / created : 0, conflicts, verifiedWithoutStock: noStock,
    active, pendingDeliveries, reconciliation, club: { disputed, pendingPoints: pendingPoints._sum.points ?? 0, otpAlerts }, alarm: disputed > 0 || otpAlerts > 0 || noStock > 0 || pendingDeliveries > 0 || reconciliation.some(r => r.reserved !== r.ledger_reserved || r.available !== r.on_hand - r.reserved) };
}
export function startSecurityJobs() {
  let running = false;
  const tick = async () => {
    if (running) return;
    running = true;
    try {
      const released = await releaseExpired();
      await processSecurityOutbox();
      logger.info({ released }, "Security stock job");
    } catch (error) { logger.error({ error }, "Security stock job failed"); }
    finally { running = false; }
  };
  const timer = setInterval(tick, 60000);
  timer.unref();
  const daily = setInterval(async () => { try { logger.info({ metrics: await stockMetrics() }, "Daily inventory reconciliation; compare with physical warehouse count"); } catch(error) { logger.error({ error }, "Reconciliation failed"); } }, 86400000);
  daily.unref();
  return () => { clearInterval(timer); clearInterval(daily); };
}
