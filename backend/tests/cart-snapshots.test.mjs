import test from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import { createFixture } from "./fixture.mjs";

test("anonymous cart snapshots update, expire on dashboard read, and convert without PII", async () => {
  const fixture = await createFixture();
  process.env.ABANDONED_CART_MINUTES = "30";
  const product = await fixture.client.product.create({ data: { name: "Audit cheeseburger", price: 580000, stock: 8, category: "burgers", isActive: true } });
  const { default: app } = await import("../src/app.js");
  const { prisma } = await import("../src/config/prisma.js");
  const { getDashboard } = await import("../src/services/dashboardService.js");
  const { markCartConverted, hashCartSession } = await import("../src/services/cartSnapshotService.js");
  const server = app.listen(0, "127.0.0.1");
  await new Promise((resolve) => server.once("listening", resolve));
  const origin = `http://127.0.0.1:${server.address().port}`;
  const sessionId = crypto.randomUUID();
  try {
    const response = await fetch(`${origin}/api/public/cart`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ sessionId, items: [{ productId: product.id, quantity: 2 }] }) });
    assert.equal(response.status, 204);
    const cart = await prisma.cartSnapshot.findUnique({ where: { sessionHash: hashCartSession(sessionId) } });
    assert.equal(cart.status, "ACTIVE");
    assert.equal(Number(cart.totalAmount), 1160000);
    assert.equal(cart.items[0].quantity, 2);
    assert.equal(JSON.stringify(cart).includes(sessionId), false);

    await prisma.cartSnapshot.update({ where: { id: cart.id }, data: { lastActivity: new Date(Date.now() - 31 * 60_000) } });
    const dashboard = await getDashboard();
    assert.equal(dashboard.abandonedCarts.abandoned, 1);
    assert.equal(dashboard.abandonedCarts.lostValue, 1160000);
    assert.equal(dashboard.abandonedCarts.topItems[0].productId, product.id);

    const convertedSession = crypto.randomUUID();
    await prisma.cartSnapshot.create({ data: { sessionHash: hashCartSession(convertedSession), items: [{ productId: product.id, quantity: 1 }], totalAmount: 580000 } });
    assert.equal(await markCartConverted(prisma, convertedSession), 1);
    assert.equal((await prisma.cartSnapshot.findUnique({ where: { sessionHash: hashCartSession(convertedSession) } })).status, "CONVERTED");

    const cleared = await fetch(`${origin}/api/public/cart`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ sessionId, items: [] }) });
    assert.equal(cleared.status, 204);
    assert.equal(await prisma.cartSnapshot.findUnique({ where: { sessionHash: hashCartSession(sessionId) } }), null);
  } finally {
    await new Promise((resolve) => server.close(resolve));
    await fixture.cleanup();
  }
});
