// npm test  ->  node --test --test-concurrency=1 tests/*.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";

import {
  toRial,
  buildNoStockRefundPayload,
  finalizeVerifiedPayment,
} from "../src/services/stockService.js";
import { AppError } from "../src/utils/AppError.js";
import { securityProviders } from "../src/services/securityProviders.js";

// In-memory tx stub: only the surface the "verified payment without stock" branch needs.
function fakeTx({ available = 0, paymentStatus = "PENDING" } = {}) {
  const outbox = [];
  const tx = {
    $queryRaw: async (strings) => {
      const sql = String.raw(strings);
      if (sql.includes("product_stock")) return [{ available }];
      return [{ id: "order_1" }];
    },
    chatOrder: {
      findUnique: async () => ({
        id: "order_1",
        status: "PENDING_PAYMENT",
        expiresAt: new Date(Date.now() + 60_000),
        items: [{ productId: "sku_1", quantity: 2 }],
      }),
      updateMany: async () => ({ count: 1 }),
      update: async () => ({}),
    },
    chatPayment: {
      findUnique: async () => ({ id: "pay_1", status: paymentStatus }),
      update: async () => ({}),
    },
    stockReservation: {
      count: async () => 0,
      create: async () => ({}),
      findMany: async () => [],
      updateMany: async () => ({ count: 1 }),
    },
    securityOutbox: {
      upsert: async ({ create }) => {
        outbox.push(create);
        return create;
      },
    },
    securityAudit: { create: async () => ({}) },
    $executeRaw: async () => 1,
  };
  return { tx, outbox };
}

const payment = (extra = {}) => ({
  id: "pay_1",
  orderId: "order_1",
  amountToman: 185000,
  method: "PAYPING",
  ...extra,
});

test("toRial converts Toman to Rial and rejects bad amounts", () => {
  assert.equal(toRial(185000), 1_850_000);
  assert.equal(toRial("12000"), 120_000);
  assert.equal(toRial(0.5), 5);
  assert.throws(() => toRial(0), /نامعتبر/);
  assert.throws(() => toRial(-1), /نامعتبر/);
  assert.throws(() => toRial("abc"), /نامعتبر/);
  assert.throws(() => toRial(0.55), /نامعتبر/); // would be a fractional Rial
});

test("refund payload carries Rial amount and the gateway ref, never the internal id as ref", () => {
  const p = buildNoStockRefundPayload(
    payment({ paypingPaymentRefId: "pp-123" }),
  );
  assert.equal(p.paymentId, "pay_1");
  assert.equal(p.amountToman, 185000);
  assert.equal(p.amountRial, 1_850_000);
  assert.equal(p.currency, "TOMAN");
  assert.equal(p.gatewayMethod, "PAYPING");
  assert.equal(p.gatewayRef, "pp-123");
  assert.notEqual(p.gatewayRef, p.paymentId);
  assert.equal(p.amount, undefined); // ambiguous legacy key must stay gone
});

test("missing gateway ref stays null instead of falling back to the internal id", () => {
  const p = buildNoStockRefundPayload(payment());
  assert.equal(p.gatewayRef, null);
});

test("an unconvertible amount never throws inside the finalize transaction", () => {
  const p = buildNoStockRefundPayload(payment({ amountToman: 0.55 }));
  assert.equal(p.amountRial, null);
});

test("no stock -> REFUND_PENDING with refund/notification/ticket outbox rows", async () => {
  const { tx, outbox } = fakeTx({ available: 0 });
  const result = await finalizeVerifiedPayment(
    tx,
    payment({ paypingPaymentRefId: "pp-123" }),
  );
  assert.equal(result.status, "REFUND_PENDING");
  assert.deepEqual(outbox.map((r) => r.kind).sort(), [
    "notification",
    "refund",
    "ticket",
  ]);
  const refund = outbox.find((r) => r.kind === "refund");
  assert.equal(refund.payload.amountRial, 1_850_000);
  assert.equal(refund.payload.gatewayRef, "pp-123");
});

test("stock available -> PAID and no refund rows", async () => {
  const { tx, outbox } = fakeTx({ available: 10 });
  const result = await finalizeVerifiedPayment(tx, payment());
  assert.equal(result.status, "PAID");
  assert.equal(outbox.filter((r) => r.kind === "refund").length, 0);
});

test("already-finalized payment is returned as a duplicate", async () => {
  const { tx, outbox } = fakeTx({ paymentStatus: "REFUND_PENDING" });
  const result = await finalizeVerifiedPayment(tx, payment());
  assert.deepEqual(result, { status: "REFUND_PENDING", duplicate: true });
  assert.equal(outbox.length, 0);
});

test("regression: reserving beyond stock raises AppError (not ReferenceError)", async () => {
  const { tx } = fakeTx({ available: 10 });
  tx.$executeRaw = async () => 0; // reserve UPDATE affects 0 rows
  await assert.rejects(
    finalizeVerifiedPayment(tx, payment()),
    (err) => err instanceof AppError && err.code === "OUT_OF_STOCK",
  );
});

test("contract: outbox refund payload has exactly what the provider validates (positive safe-integer Rial)", async () => {
  // In test/dev the provider uses its mock and skips validation, so assert the validated
  // fields directly (same checks as securityProviders.refund) and that the request round-trips.
  const { tx, outbox } = fakeTx({ available: 0 });
  await finalizeVerifiedPayment(tx, payment({ paypingPaymentRefId: "pp-123" }));
  const refund = outbox.find((r) => r.kind === "refund");
  const request = {
    ...refund.payload,
    idempotencyKey: refund.key,
    orderId: refund.orderId,
    paymentId: refund.paymentId,
    amount: refund.payload.amountRial,
  };
  assert.equal(typeof request.idempotencyKey, "string");
  assert.ok(request.idempotencyKey.length > 0);
  assert.ok(request.paymentId);
  assert.ok(Number.isSafeInteger(request.amount) && request.amount > 0);
  const result = await securityProviders.refund(request);
  assert.ok(result.reference);
});
