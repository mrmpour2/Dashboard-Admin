import test from 'node:test';
import assert from 'node:assert/strict';
import { createFixture } from './fixture.mjs';

test('Audit regressions against an isolated PostgreSQL schema', async (t) => {
  const fixture = await createFixture();
  const { prisma } = await import('../src/config/prisma.js');
  const auth = await import('../src/services/authService.js');
  const payments = await import('../src/controllers/paymentController.js');
  const { env } = await import('../src/config/env.js');
  const { signAccessToken } = await import('../src/utils/tokens.js');
  const { requireAuth } = await import('../src/middleware/auth.js');
  const nativeFetch = globalThis.fetch;
  env.ZIBAL_MERCHANT = 'audit-mock-only';

  async function invoke(controller, req) {
    let error, data;
    const res = { json(value) { data = value; return this; }, status() { return this; } };
    await controller(req, res, (value) => { error = value; });
    return { error, data };
  }
  async function makeOrder({ status = 'PENDING_PAYMENT', method = 'CARD_TO_CARD', paymentStatus = 'PENDING_REVIEW' } = {}) {
    const product = await prisma.product.create({ data: { name: 'Audit item', price: 10000, stock: 3 } });
    const order = await prisma.chatOrder.create({ data: {
      orderNumber: 'AUDIT-' + product.id, customerName: 'Audit Customer', customerPhone: '09120000000',
      shippingAddress: 'Isolated audit fixture', subtotalAmount: 10000, totalAmount: 10000, status,
      items: { create: { productId: product.id, quantity: 1, unitPrice: 10000 } },
    } });
    const payment = await prisma.chatPayment.create({ data: { orderId: order.id, method, status: paymentStatus,
      amountToman: 10000, amountRial: 100000n, ...(method === 'ZIBAL' ? { zibalTrackId: String(Date.now()) } : {}),
    } });
    return { product, order, payment };
  }
  const reviewReq = (payment, decision) => ({ params: { paymentId: payment.id }, body: { decision }, user: fixture.admin });

  try {
    await t.test('concurrent refresh consumes one token exactly once', async () => {
      const login = await auth.login({ email: fixture.admin.email, password: fixture.password });
      // Force both callers to see the same unrevoked row before either consumes it.
      const original = prisma.refreshToken.findUnique.bind(prisma.refreshToken);
      let reads = 0, release;
      const gate = new Promise((resolve) => { release = resolve; });
      prisma.refreshToken.findUnique = async (...args) => {
        const result = await original(...args);
        reads += 1;
        if (reads === 2) release();
        await gate;
        return result;
      };
      let results;
      try { results = await Promise.allSettled([auth.refresh(login.refreshToken), auth.refresh(login.refreshToken)]); }
      finally { prisma.refreshToken.findUnique = original; }
      assert.equal(results.filter((result) => result.status === 'fulfilled').length, 1);
      assert.equal(results.find((result) => result.status === 'rejected')?.reason.statusCode, 401);
    });

    await t.test('refresh cannot renew a stale authentication version', async () => {
      const login = await auth.login({ email: fixture.admin.email, password: fixture.password });
      await prisma.user.update({ where: { id: fixture.admin.id }, data: { authVersion: { increment: 1 } } });
      await assert.rejects(auth.refresh(login.refreshToken), { statusCode: 401 });
    });

    await t.test('club credentials cannot authenticate as dashboard staff', async () => {
      const jwt = (await import('jsonwebtoken')).default;
      const token = jwt.sign({ sub: fixture.staff.id, scope: 'club', version: 0 }, env.JWT_ACCESS_SECRET,
        { audience: 'club-member', issuer: 'elin-club', expiresIn: '1m' });
      let error;
      await requireAuth({ headers: { authorization: 'Bearer ' + token } }, {}, (value) => { error = value; });
      assert.equal(error?.statusCode, 401);
      let accepted;
      await requireAuth({ headers: { authorization: 'Bearer ' + signAccessToken(fixture.staff) } }, {}, (value) => { accepted = value; });
      assert.equal(accepted, undefined);
    });

    await t.test('receipt approval cannot revive a cancelled order', async () => {
      const { payment, order } = await makeOrder({ status: 'CANCELLED' });
      const result = await invoke(payments.reviewCardToCardReceipt, reviewReq(payment, 'approve'));
      assert.equal(result.error?.statusCode, 400);
      assert.equal((await prisma.chatOrder.findUnique({ where: { id: order.id } })).status, 'CANCELLED');
      assert.equal((await prisma.chatPayment.findUnique({ where: { id: payment.id } })).status, 'PENDING_REVIEW');
    });

    await t.test('two reviews of one receipt allow one decision', async () => {
      const { payment, product, order } = await makeOrder();
      const original = prisma.chatPayment.findUnique.bind(prisma.chatPayment);
      let reads = 0, release;
      const gate = new Promise((resolve) => { release = resolve; });
      prisma.chatPayment.findUnique = async (...args) => {
        const result = await original(...args);
        reads += 1;
        if (reads === 2) release();
        await gate;
        return result;
      };
      let results;
      try { results = await Promise.all(['reject', 'reject'].map((decision) => invoke(payments.reviewCardToCardReceipt, reviewReq(payment, decision)))); }
      finally { prisma.chatPayment.findUnique = original; }
      assert.equal(results.filter((result) => !result.error).length, 1);
      assert.equal((await prisma.product.findUnique({ where: { id: product.id } })).stock, 4);
      assert.equal((await prisma.chatOrder.findUnique({ where: { id: order.id } })).status, 'CANCELLED');
    });

    await t.test('verified gateway success cannot revive a cancelled order', async () => {
      const { payment, order } = await makeOrder({ status: 'CANCELLED', method: 'ZIBAL', paymentStatus: 'PENDING' });
      globalThis.fetch = async () => new Response(JSON.stringify({ result: 100, amount: 100000, refNumber: 'MOCK' }), { status: 200 });
      const result = await invoke(payments.verifyZibalRequest, { body: { paymentId: payment.id, trackId: payment.zibalTrackId } });
      assert.equal(result.error?.statusCode, 400);
      assert.equal((await prisma.chatOrder.findUnique({ where: { id: order.id } })).status, 'CANCELLED');
    });

    await t.test('two failed gateway callbacks restore stock once', async () => {
      const { payment, product } = await makeOrder({ method: 'ZIBAL', paymentStatus: 'PENDING' });
      globalThis.fetch = async () => new Response(JSON.stringify({ result: 202 }), { status: 200 });
      const results = await Promise.all(Array.from({ length: 4 }, () => invoke(payments.verifyZibalRequest,
        { body: { paymentId: payment.id, trackId: payment.zibalTrackId } })));
      assert.ok(results.every((result) => !result.error));
      assert.equal((await prisma.product.findUnique({ where: { id: product.id } })).stock, 4);
    });
  } finally {
    globalThis.fetch = nativeFetch;
    await prisma.$disconnect();
    await fixture.cleanup();
  }
});
