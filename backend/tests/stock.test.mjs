import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { writeFile, mkdir } from "node:fs/promises";
import { createFixture } from "./fixture.mjs";
import { execFileSync } from "node:child_process";

test("SEC-005: atomic reservation lifecycle in disposable PostgreSQL", async t => {
  const fixture = await createFixture();
  const { prisma } = await import("../src/config/prisma.js");
  const payments = await import("../src/controllers/paymentController.js");
  const stock = await import("../src/services/stockService.js");
  const otp = await import("../src/services/otpService.js");
  const providers = await import("../src/services/securityProviders.js");
  const { env } = await import("../src/config/env.js");
  const nativeFetch = globalThis.fetch;
  const results = [];
  let n = 0;
  async function check(name, fn) { await t.test(name, async () => { await fn(); results.push({ name, passed: true }); }); }
  async function invoke(controller, req) {
    let error, data, status = 200;
    await controller(req, { status(v) { status=v; return this; }, json(v) { data=v; return this; } }, e => { error=e; });
    return { error, data, status };
  }
  async function item(stockCount = 1) { return prisma.product.create({ data: { name: "Security test", price: 10000, stock: stockCount } }); }
  function request(product, { phone, ip, key, quantity = 1, selectedOptionIds = [] } = {}) {
    n++;
    phone ??= "0912" + String(n).padStart(7, "0");
    return { body: { customerName: "Synthetic guest", customerPhone: phone, shippingAddress: "Disposable test address", items: [{ productId: product.id, quantity, ...(selectedOptionIds.length ? { selectedOptionIds } : null) }] },
      checkoutPhone: phone, ip: ip ?? `192.0.2.${n}`, headers: { "idempotency-key": key ?? randomUUID() } };
  }
  async function create(product, options) {
    const req = request(product, options), result = await invoke(payments.createChatOrder, req);
    assert.equal(result.error, undefined, result.error?.stack);
    return { order: result.data.order, req };
  }
  async function expire(order) {
    await prisma.chatOrder.update({ where: { id: order.id }, data: { expiresAt: new Date(0) } });
    await prisma.stockReservation.updateMany({ where: { orderId: order.id }, data: { expiresAt: new Date(0) } });
    return stock.releaseExpired({ dryRun: false });
  }
  try {
    await check("backfill dry-run preserves data, apply reconstructs legacy on_hand and rerun is idempotent", async () => {
      const product = await item(0);
      await prisma.productStock.delete({ where: { skuId: product.id } });
      const order = await prisma.chatOrder.create({ data: { orderNumber: `LEGACY-${randomUUID()}`, customerName: "Legacy synthetic", customerPhone: "09129999991", shippingAddress: "Disposable", subtotalAmount: 10000, totalAmount: 10000,
        items: { create: { productId: product.id, quantity: 1, unitPrice: 10000 } } } });
      const run = (...args) => JSON.parse(execFileSync(process.execPath, [new URL("../scripts/backfill-stock.mjs", import.meta.url).pathname.replace(/^\/(.:)/, "$1"), ...args], { env: process.env, encoding: "utf8" }));
      assert.equal(run().dryRun, true);
      assert.equal(await prisma.productStock.findUnique({ where: { skuId: product.id } }), null);
      assert.equal(run("--apply").legacyOrders, 1);
      assert.equal((await prisma.productStock.findUnique({ where: { skuId: product.id } })).onHand, 1);
      assert.equal(run("--apply").legacyOrders, 0);
      await stock.cancelChatOrder(order.id);
    });
    await check("unpaid hold preserves on_hand and expiry restores availability", async () => {
      const product = await item(); const { order } = await create(product);
      assert.deepEqual(await prisma.productStock.findUnique({ where: { skuId: product.id } }), { skuId: product.id, onHand: 1, reserved: 1 });
      assert.equal((await prisma.product.findUnique({ where: { id: product.id } })).stock, 0);
      await expire(order);
      assert.equal((await prisma.productStock.findUnique({ where: { skuId: product.id } })).reserved, 0);
      await create(product);
    });
    await check("true concurrent race for last unit admits one order", async () => {
      const product = await item();
      const results = await Promise.all([request(product), request(product)].map(r => invoke(payments.createChatOrder, r)));
      assert.equal(results.filter(r => !r.error).length, 1);
      assert.equal(results.find(r => r.error).error.statusCode, 409);
    });
    await check("same idempotency key returns one order and rejects changed payload", async () => {
      const product = await item(3), req = request(product);
      const pair = await Promise.all([invoke(payments.createChatOrder, req), invoke(payments.createChatOrder, req)]);
      assert.ok(pair.every(r => !r.error)); assert.equal(pair[0].data.order.id, pair[1].data.order.id);
      assert.equal((await prisma.productStock.findUnique({ where: { skuId: product.id } })).reserved, 1);
      const changed = structuredClone(req); changed.body.items[0].quantity = 2;
      assert.equal((await invoke(payments.createChatOrder, changed)).error.code, "IDEMPOTENCY_CONFLICT");
    });
    await check("cancellation releases rather than expires and is idempotent", async () => {
      const product = await item(); const { order } = await create(product);
      await Promise.all([stock.cancelChatOrder(order.id), stock.cancelChatOrder(order.id)]);
      assert.equal((await prisma.stockReservation.findFirst({ where: { orderId: order.id } })).status, "released");
      assert.equal((await prisma.productStock.findUnique({ where: { skuId: product.id } })).onHand, 1);
    });
    await check("one active order per phone or IP and five reservations per hour", async () => {
      const product = await item(10), { order, req } = await create(product);
      assert.equal((await invoke(payments.createChatOrder, request(product, { phone: req.checkoutPhone }))).error.code, "RESERVATION_LIMIT");
      assert.equal((await invoke(payments.createChatOrder, request(product, { ip: req.ip }))).error.code, "RESERVATION_LIMIT");
      await stock.cancelChatOrder(order.id);
      for (let i = 0; i < 4; i++) { const r = await create(product, { phone: req.checkoutPhone }); await stock.cancelChatOrder(r.order.id); }
      assert.equal((await invoke(payments.createChatOrder, request(product, { phone: req.checkoutPhone }))).error.code, "RESERVATION_LIMIT");
    });
    await check("two expiry workers release once; dry-run leaves stock untouched", async () => {
      const product = await item(); const { order } = await create(product);
      await prisma.chatOrder.update({ where: { id: order.id }, data: { expiresAt: new Date(0) } });
      await prisma.stockReservation.updateMany({ where: { orderId: order.id }, data: { expiresAt: new Date(0) } });
      await stock.releaseExpired({ dryRun: true });
      assert.equal((await prisma.productStock.findUnique({ where: { skuId: product.id } })).reserved, 1);
      await Promise.all([stock.releaseExpired({ dryRun: false }), stock.releaseExpired({ dryRun: false })]);
      assert.equal((await prisma.productStock.findUnique({ where: { skuId: product.id } })).reserved, 0);
    });
    await check("OTP is hashed, single-use, five-attempt locked and guest without proof is rejected", async () => {
      const phone = "09129999990";
      const issued = await otp.requestOtp({ phone, ip: "192.0.2.245" });
      const code = providers.mockDeliveries.at(-1).code;
      assert.notEqual((await prisma.otpCode.findUnique({ where: { id: issued.challengeId } })).codeHash, code);
      for (let i = 0; i < 5; i++) await assert.rejects(otp.consumeOtp({ phone, subject: "checkout", challengeId: issued.challengeId, code: code === "000000" ? "111111" : "000000", captchaToken: "mock-captcha-ok" }));
      await assert.rejects(otp.consumeOtp({ phone, subject: "checkout", challengeId: issued.challengeId, code, captchaToken: "mock-captcha-ok" }));
      const { default: app } = await import("../src/app.js");
      const server = app.listen(0, "127.0.0.1"); await new Promise(r => server.once("listening", r));
      try { const response = await nativeFetch(`http://127.0.0.1:${server.address().port}/api/payment/orders`, { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" }); assert.equal(response.status, 401); }
      finally { await new Promise(r => server.close(r)); }
    });
    await check("custom options are validated, priced from the database, and snapshotted", async () => {
      const product = await item(2);
      const otherProduct = await item(2);
      const option = await prisma.productOption.create({ data: { productId: product.id, label: "Extra cheese", labelEn: "Extra cheese", priceDelta: 1200, sortOrder: 0 } });
      const foreignOption = await prisma.productOption.create({ data: { productId: otherProduct.id, label: "Foreign", priceDelta: 5000 } });
      const disabledOption = await prisma.productOption.create({ data: { productId: product.id, label: "Disabled", priceDelta: 9000, isActive: false } });
      const { order } = await create(product, { selectedOptionIds: [option.id] });
      assert.equal(order.items[0].unitPrice, 11200);
      assert.deepEqual(order.items[0].selectedOptions, [{ id: option.id, label: "Extra cheese", labelEn: "Extra cheese", priceDelta: 1200 }]);
      assert.equal(order.totalAmount, 112320);
      assert.equal((await invoke(payments.createChatOrder, request(product, { selectedOptionIds: [foreignOption.id] }))).error.statusCode, 400);
      assert.equal((await invoke(payments.createChatOrder, request(product, { selectedOptionIds: [disabledOption.id] }))).error.statusCode, 400);
    });
    await check("database prevents negative stock and audit modification", async () => {
      const product = await item();
      await assert.rejects(prisma.$executeRaw`UPDATE product_stock SET reserved=2 WHERE sku_id=${product.id}`);
      const row = await prisma.securityAudit.findFirst();
      await assert.rejects(prisma.securityAudit.update({ where: { id: row.id }, data: { action: "tampered" } }));
    });
    await check("public product reads lazily expire stock and rollout fallback never uses permanent deductions", async () => {
      const product = await item(); const { order } = await create(product);
      await prisma.chatOrder.update({ where: { id: order.id }, data: { expiresAt: new Date(0) } });
      const { findPublicMenuItem } = await import("../src/services/publicMenuService.js");
      assert.equal((await findPublicMenuItem(product.id)).stock, 1);
      const prior = env.STOCK_ROLLOUT_PERCENT;
      env.STOCK_ROLLOUT_PERCENT = 0;
      try { assert.equal((await invoke(payments.createChatOrder, request(product))).error.statusCode, 503); }
      finally { env.STOCK_ROLLOUT_PERCENT = prior; }
      assert.equal((await prisma.productStock.findUnique({ where: { skuId: product.id } })).onHand, 1);
    });
  } finally {
    globalThis.fetch = nativeFetch;
    const dir = new URL("../../../audit/evidence/", import.meta.url); await mkdir(dir, { recursive: true });
    await writeFile(new URL("sec005-after.json", dir), JSON.stringify({ timestamp: new Date(), environment: "Disposable loopback PostgreSQL; SMS/refund mocks; no AI calls", independentVerification: false, tests: results }, null, 2));
    await prisma.$disconnect(); await fixture.cleanup();
  }
});
