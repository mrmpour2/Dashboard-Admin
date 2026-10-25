import { setInterval, clearInterval } from "node:timers";
import { prisma } from "../config/prisma.js";
import { env } from "../config/env.js";
import { logger } from "../config/logger.js";
import { ServiceUnavailableError } from "../utils/AppError.js";
import { releaseExpired } from "./stockService.js";
import {
  securityProviders,
  isNonRetryableProviderError,
  InvalidProviderInputError,
  NotificationNotDeliveredError,
  RefundOutcomeUnknownError,
} from "./securityProviders.js";
import { securityAudit } from "./otpService.js";

/**
 * Security outbox worker.
 *
 * Design rules:
 *  1. The provider call NEVER runs inside a DB transaction holding a row lock.
 *     Claim (short statement) -> provider call -> settle (short transaction).
 *  2. Each event is attempted at most once per run (>= JOB_INTERVAL_MS between
 *     attempts) and at most MAX_ATTEMPTS times in total.
 *  3. A refund whose outcome is unknown is NEVER retried. It moves to
 *     `needs_reconciliation`, an audit row is written and a ticket is opened.
 *  4. An undelivered notification is NEVER recorded as `completed`.
 *  5. A crashed worker leaves the row `processing`; stale locks are recovered
 *     (refund -> needs_reconciliation, anything else -> pending).
 *
 * Requires: security_outbox.locked_at (see the accompanying SQL migration) and
 * a text `status` column that accepts: processing, failed,
 * needs_reconciliation, undelivered.
 */

const MAX_ATTEMPTS = 5;
const BATCH_LIMIT = 20;
const STALE_LOCK_MINUTES = 10;
const JOB_INTERVAL_MS = 60_000;
const RECONCILIATION_INTERVAL_MS = 86_400_000;

const STATUS = {
  PENDING: "pending",
  COMPLETED: "completed",
  FAILED: "failed",
  NEEDS_RECONCILIATION: "needs_reconciliation",
  UNDELIVERED: "undelivered",
};
const ATTENTION_STATUSES = [
  STATUS.FAILED,
  STATUS.NEEDS_RECONCILIATION,
  STATUS.UNDELIVERED,
];

/* -------------------------------------------------------------------------- */
/* Helpers                                                                    */
/* -------------------------------------------------------------------------- */

// Never log the error object/message: provider or SDK text may echo secrets.
function errInfo(err) {
  return { errName: err?.name ?? "Error", errCode: err?.code };
}

async function claimNext(seenIds) {
  const rows = await prisma.$queryRaw`
    UPDATE security_outbox
       SET status = 'processing', locked_at = now(), attempts = attempts + 1
     WHERE id = (
       SELECT id FROM security_outbox
        WHERE status = 'pending' AND id::text <> ALL(${seenIds}::text[])
        ORDER BY attempts, created_at
        LIMIT 1
        FOR UPDATE SKIP LOCKED
     )
     RETURNING id`;
  return rows.length ? rows[0].id : null;
}

async function complete(event, tx = prisma) {
  await tx.securityOutbox.update({
    where: { id: event.id },
    data: { status: STATUS.COMPLETED, completedAt: new Date() },
  });
  await securityAudit(tx, `outbox.${event.kind}.completed`, event.orderId);
}

async function settle(event, status) {
  await prisma.$transaction(async (tx) => {
    await tx.$executeRaw`UPDATE security_outbox SET status = ${status}, locked_at = NULL WHERE id = ${event.id}`;
    await securityAudit(tx, `outbox.${event.kind}.${status}`, event.orderId);
  });
}

async function openIncidentTicket(event, reason) {
  try {
    await prisma.ticket.upsert({
      where: { id: `SEC-INC-${event.id}` },
      update: {},
      create: {
        id: `SEC-INC-${event.id}`,
        title: "بررسی پرداخت و موجودی",
        description: JSON.stringify({
          eventId: event.id,
          kind: event.kind,
          orderId: event.orderId,
          paymentId: event.paymentId,
          reason,
        }),
        priority: "HIGH",
      },
    });
  } catch (err) {
    logger.error(
      { eventId: event.id, ...errInfo(err) },
      "Failed to open incident ticket",
    );
  }
}

function classifyFailure(event, err) {
  if (err instanceof RefundOutcomeUnknownError || err?.outcomeUnknown)
    return STATUS.NEEDS_RECONCILIATION;
  // Unexpected error around a refund: we cannot prove no money moved.
  if (
    event.kind === "refund" &&
    !(err instanceof ServiceUnavailableError) &&
    !(err instanceof InvalidProviderInputError)
  )
    return STATUS.NEEDS_RECONCILIATION;
  if (err instanceof NotificationNotDeliveredError) return STATUS.UNDELIVERED;
  if (err instanceof InvalidProviderInputError) return STATUS.FAILED;
  if (isNonRetryableProviderError(err)) return STATUS.FAILED;
  if (event.attempts >= MAX_ATTEMPTS) return STATUS.FAILED;
  return STATUS.PENDING; // retried on a later run
}

async function handleFailure(event, err) {
  const next = classifyFailure(event, err);
  const log = next === STATUS.PENDING ? logger.warn : logger.error;
  log.call(
    logger,
    {
      eventId: event.id,
      kind: event.kind,
      attempts: event.attempts,
      next,
      ...errInfo(err),
    },
    "Security outbox event not completed",
  );
  try {
    await settle(event, next);
    if (next !== STATUS.PENDING && next !== STATUS.UNDELIVERED) {
      await openIncidentTicket(event, next);
    }
  } catch (settleErr) {
    // Row stays `processing`; stale-lock recovery will handle it.
    logger.error(
      { eventId: event.id, ...errInfo(settleErr) },
      "Could not record outbox failure; relying on stale-lock recovery",
    );
  }
}

/* -------------------------------------------------------------------------- */
/* Event handlers                                                             */
/* -------------------------------------------------------------------------- */

async function runRefund(event) {
  const result = await securityProviders.refund({
    ...event.payload,
    idempotencyKey: event.key,
    orderId: event.orderId,
    paymentId: event.paymentId,
    amount: event.payload?.amountRial, // provider contract: positive integer, Rial
  });
  if (!result?.reference) {
    throw new RefundOutcomeUnknownError(
      "Provider did not confirm a refund reference",
    );
  }

  // From here the provider has moved money. A local DB failure must NEVER lead
  // to a second refund attempt, so it is escalated as "outcome unknown".
  try {
    await prisma.$transaction(
      async (tx) => {
        await tx.chatPayment.update({
          where: { id: event.paymentId },
          data: { status: "REFUNDED" },
        });
        await tx.chatOrder.updateMany({
          where: { id: event.orderId, status: "REFUND_PENDING" },
          data: { status: "REFUNDED" },
        });
        await complete(event, tx);
      },
      { timeout: 15_000 },
    );
  } catch (err) {
    logger.error(
      {
        eventId: event.id,
        orderId: event.orderId,
        reference: result.reference,
        ...errInfo(err),
      },
      "Refund executed at provider but local finalize failed; reconcile manually",
    );
    throw new RefundOutcomeUnknownError(
      "Refund executed but local state was not finalized",
    );
  }
  logger.info(
    { eventId: event.id, reference: result.reference },
    "Refund completed",
  );
}

async function runTicket(event) {
  await prisma.$transaction(async (tx) => {
    await tx.ticket.upsert({
      where: { id: `SEC-${event.id}` },
      update: {},
      create: {
        id: `SEC-${event.id}`,
        title: "بررسی پرداخت و موجودی",
        description: JSON.stringify({
          orderId: event.orderId,
          paymentId: event.paymentId,
          ...event.payload,
        }),
        priority: "HIGH",
      },
    });
    await complete(event, tx);
  });
}

async function runNotify(event) {
  const result = await securityProviders.notify({
    ...event.payload,
    idempotencyKey: event.key,
    orderId: event.orderId,
  });
  if (result?.delivered === false) throw new NotificationNotDeliveredError();
  await complete(event);
}

async function processEvent(event) {
  try {
    if (event.kind === "refund") await runRefund(event);
    else if (event.kind === "ticket") await runTicket(event);
    else await runNotify(event);
  } catch (err) {
    await handleFailure(event, err);
  }
}

/* -------------------------------------------------------------------------- */
/* Stale lock recovery                                                        */
/* -------------------------------------------------------------------------- */

async function recoverStaleOutbox() {
  const rows = await prisma.$queryRaw`
    UPDATE security_outbox
       SET status = CASE WHEN kind = 'refund' THEN 'needs_reconciliation' ELSE 'pending' END,
           locked_at = NULL
     WHERE status = 'processing'
       AND locked_at < now() - make_interval(mins => ${STALE_LOCK_MINUTES}::int)
     RETURNING id, kind`;
  for (const row of rows) {
    logger.error(
      { eventId: row.id, kind: row.kind },
      "Recovered stale outbox lock",
    );
    if (row.kind !== "refund") continue;
    const event = await prisma.securityOutbox.findUnique({
      where: { id: row.id },
    });
    if (!event) continue;
    await securityAudit(
      prisma,
      `outbox.refund.${STATUS.NEEDS_RECONCILIATION}`,
      event.orderId,
    );
    await openIncidentTicket(event, "stale_lock_refund");
  }
  return rows.length;
}

/* -------------------------------------------------------------------------- */
/* Public API                                                                 */
/* -------------------------------------------------------------------------- */

export async function processSecurityOutbox({
  dryRun = env.STOCK_JOB_DRY_RUN,
  limit = BATCH_LIMIT,
} = {}) {
  if (dryRun) {
    return {
      dryRun: true,
      count: await prisma.securityOutbox.count({
        where: { status: STATUS.PENDING },
      }),
    };
  }

  await recoverStaleOutbox();

  const seenIds = []; // each event is attempted at most once per run
  let count = 0;
  for (let i = 0; i < limit; i++) {
    const id = await claimNext(seenIds);
    if (id === null) break;
    seenIds.push(String(id));
    const event = await prisma.securityOutbox.findUnique({ where: { id } });
    if (!event) continue;
    await processEvent(event);
    count++;
  }
  return { dryRun: false, count };
}

export async function stockMetrics() {
  const [disputed, pendingPoints, otpAlerts] = await Promise.all([
    prisma.clubClaim.count({ where: { status: "disputed" } }),
    prisma.clubPointAccrual.aggregate({
      where: { status: "pending" },
      _sum: { points: true },
    }),
    prisma.securityOutbox.count({
      where: { key: { startsWith: "otp-alert:" }, status: STATUS.PENDING },
    }),
  ]);
  const [
    created,
    expired,
    conflicts,
    noStock,
    active,
    pendingDeliveries,
    outboxAttentionRows,
    reconciliation,
  ] = await Promise.all([
    prisma.stockReservation.count(),
    prisma.stockReservation.count({ where: { status: "expired" } }),
    prisma.securityAudit.count({ where: { action: "stock.conflict" } }),
    prisma.securityAudit.count({ where: { action: "payment.no_stock" } }),
    prisma.chatOrder.groupBy({
      by: ["phoneHash", "ipHash"],
      where: { status: "RESERVED" },
      _count: true,
    }),
    prisma.securityOutbox.count({ where: { status: STATUS.PENDING } }),
    prisma.$queryRaw`SELECT COUNT(*)::int AS n FROM security_outbox
      WHERE status = ANY(${ATTENTION_STATUSES}::text[])`,
    prisma.$queryRaw`SELECT s.sku_id, s.on_hand, s.reserved, p.stock AS available,
      COALESCE(SUM(r.qty),0)::int AS ledger_reserved FROM product_stock s JOIN products p ON p.id=s.sku_id
      LEFT JOIN stock_reservations r ON r.sku_id=s.sku_id AND r.status='active'
      GROUP BY s.sku_id,s.on_hand,s.reserved,p.stock`,
  ]);
  const outboxAttention = outboxAttentionRows[0]?.n ?? 0;
  return {
    created,
    expired,
    expiredRate: created ? expired / created : 0,
    conflicts,
    verifiedWithoutStock: noStock,
    active,
    pendingDeliveries,
    outboxAttention, // failed / needs_reconciliation / undelivered
    reconciliation,
    club: {
      disputed,
      pendingPoints: pendingPoints._sum.points ?? 0,
      otpAlerts,
    },
    alarm:
      disputed > 0 ||
      otpAlerts > 0 ||
      noStock > 0 ||
      pendingDeliveries > 0 ||
      outboxAttention > 0 ||
      reconciliation.some(
        (r) =>
          r.reserved !== r.ledger_reserved ||
          r.available !== r.on_hand - r.reserved,
      ),
  };
}

export function startSecurityJobs() {
  let running = false;
  let stopped = false;

  const tick = async () => {
    if (running || stopped) return;
    running = true;
    try {
      // Independent steps: one failing must not block the other.
      try {
        const released = await releaseExpired();
        logger.info({ released }, "Security stock job");
      } catch (err) {
        logger.error({ err }, "Stock release failed");
      }
      try {
        const outbox = await processSecurityOutbox();
        if (outbox.count) logger.info({ outbox }, "Security outbox job");
      } catch (err) {
        logger.error({ err }, "Security outbox job failed");
      }
    } finally {
      running = false;
    }
  };

  const timer = setInterval(tick, JOB_INTERVAL_MS);
  timer.unref();

  const daily = setInterval(async () => {
    try {
      logger.info(
        { metrics: await stockMetrics() },
        "Daily inventory reconciliation; compare with physical warehouse count",
      );
    } catch (err) {
      logger.error({ err }, "Reconciliation failed");
    }
  }, RECONCILIATION_INTERVAL_MS);
  daily.unref();

  return () => {
    stopped = true;
    clearInterval(timer);
    clearInterval(daily);
  };
}
