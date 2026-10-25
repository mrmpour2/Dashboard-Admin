// node --test stockService.test.js   (node:test, no extra deps, ESM)
import { test } from "node:test";
import assert from "node:assert/strict";

import {
  toRial,
  buildNoStockRefundPayload,
  finalizeVerifiedPayment,
} from "../src/services/stockService.js";
// In-memory tx stub: only the surface the "verified payment without stock" branch needs.
function fakeTx({ available = 0, legacyGatewayTrackId = "gateway-778899" } = {}) {
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
      findUnique: async (args) =>
        args?.select
          ? { legacyGatewayTrackId }
          : {
              id: "pay_1",
              status: "VERIFIED",
              amountToman: 185000,
              legacyGatewayTrackId,
            },
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
    // 👇 این خط رو اضافه کن 👇
    securityAudit: { create: async () => ({}) },
    $executeRaw: async () => 1,
  };
  return { tx, outbox };
}

test("toRial converts Toman to Rial and rejects bad amounts", () => {
  assert.equal(toRial(185000), 1_850_000);
  assert.equal(toRial("12000"), 120_000);
  assert.equal(toRial(0.5), 5); // no float drift
  assert.throws(() => toRial(0), /نامعتبر/);
  assert.throws(() => toRial(-1), /نامعتبر/);
  assert.throws(() => toRial("abc"), /نامعتبر/);
});

test("refund payload carries the legacy gateway track id and a Rial amount", () => {
  const p = buildNoStockRefundPayload({
    id: "pay_1",
    amountToman: 185000,
    legacyGatewayTrackId: "gateway-778899",
  });
  assert.equal(p.amountRial, 1_850_000);
  assert.equal(p.amountToman, 185000);
  assert.equal(p.currency, "IRR");
  assert.equal(p.gatewayRef, "gateway-778899");
  assert.notEqual(p.gatewayRef, p.paymentId); // internal id must not masquerade as trackId
});

test("missing gateway reference stays null instead of falling back to the internal id", () => {
  const p = buildNoStockRefundPayload({ id: "pay_1", amountToman: 5000 });
  assert.equal(p.gatewayRef, null);
});

test("refund outbox row carries Rial amount + gateway trackId, never Toman", async () => {
  const { tx, outbox } = fakeTx({ available: 0, legacyGatewayTrackId: "gateway-778899" });
  const result = await finalizeVerifiedPayment(tx, {
    id: "pay_1",
    orderId: "order_1",
    amountToman: 185000,
  });

  assert.equal(result.status, "REFUND_PENDING");
  assert.deepEqual(outbox.map((r) => r.kind).sort(), [
    "notification",
    "refund",
    "ticket",
  ]);

  const refund = outbox.find((r) => r.kind === "refund");
  assert.equal(
    refund.payload.amountRial,
    1_850_000,
    "worker must send the amount in Rial",
  );
  assert.equal(refund.payload.currency, "IRR");
  assert.equal(refund.payload.gatewayRef, "gateway-778899");
  assert.equal(
    refund.payload.amount,
    undefined,
    'legacy ambiguous "amount" key must be gone',
  );
});

test("payment without a gateway id does not silently reuse the internal payment id", async () => {
  const { tx, outbox } = fakeTx({ available: 0, legacyGatewayTrackId: null });
  await finalizeVerifiedPayment(tx, {
    id: "pay_1",
    orderId: "order_1",
    amountToman: 50000,
  });
  const refund = outbox.find((r) => r.kind === "refund");
  assert.equal(refund.payload.gatewayRef, null);
  assert.equal(refund.payload.paymentId, "pay_1");
});

test("stock available -> PAID and no refund rows", async () => {
  const { tx, outbox } = fakeTx({ available: 10 });
  const result = await finalizeVerifiedPayment(tx, {
    id: "pay_1",
    orderId: "order_1",
    amountToman: 185000,
  });
  assert.equal(result.status, "PAID");
  assert.equal(outbox.filter((r) => r.kind === "refund").length, 0);
});
