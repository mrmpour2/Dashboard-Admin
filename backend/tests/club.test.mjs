import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { createFixture } from "./fixture.mjs";

/**
 * آزمون انتها-به-انتها باشگاه مشتریان روی یک schema جداگانه.
 *
 * پوشش:
 *   - عضویت/ورود/خروج و کوکی HttpOnly
 *   - نرمال‌سازی شماره و رمز فارسی
 *   - امتیاز نظر فقط پس از تأیید مدیر و فقط یک بار
 *   - امتیاز سفارش فقط برای سفارش PAID و به‌صورت idempotent
 *   - شرایط واقعی پاداش (سطح، موجودی، امتیاز، انقضا)
 *   - استرداد، idempotencyKey و جلوگیری از خرج هم‌زمان یک موجودی
 */
test("Club API awards, redeems and protects points", async (t) => {
  const fixture = await createFixture();
  const { default: app } = await import("../src/app.js");
  const { prisma } = await import("../src/config/prisma.js");
  const { awardOrderPoints, normalizePhone } = await import("../src/services/clubService.js");
  const { seedClubRewards } = await import("../prisma/seedClub.js");

  await seedClubRewards(prisma);

  const server = app.listen(0, "127.0.0.1");
  await new Promise((resolve) => server.once("listening", resolve));
  const base = `http://127.0.0.1:${server.address().port}/api`;
  const { mockDeliveries } = await import("../src/services/securityProviders.js");
  let clubCookie = "";
  let adminToken = "";
  let member;
  let product;

  async function request(
    path,
    { method = "GET", body, cookie = clubCookie, token, status = 200 } = {},
  ) {
    const response = await fetch(base + path, {
      method,
      headers: {
        ...(body && { "Content-Type": "application/json" }),
        ...(cookie && { Cookie: cookie }),
        ...(token && { Authorization: `Bearer ${token}` }),
        Origin: "http://localhost:5174",
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    const text = await response.text();
    const data = text ? JSON.parse(text) : null;
    assert.equal(response.status, status, `${method} ${path}: ${text}`);
    return { response, data };
  }

  function cookieFrom(response) {
    const values = response.headers.getSetCookie?.() ?? [];
    return values[0]?.split(";")[0] ?? "";
  }

  try {
    await t.test("public rewards reveal real catalog and eligibility", async () => {
      const { data } = await request("/public/club/rewards", { status: 200 });
      assert.equal(data.rewards.length, 4);
      assert.ok(data.rewards.every((reward) => reward.canRedeem === false));
      assert.equal(data.rewards[0].reason, "login_required");
    });

    await t.test("join normalizes Persian digits and sets an HttpOnly cookie", async () => {
      await request("/public/club/join", {
        method: "POST",
        body: { name: "مهمان آزمایشی", phone: "۱۲۳", pin: "۱۲۳۴" },
        status: 400,
      });

      const pending = await request("/public/club/join", {
        method: "POST",
        body: { name: "مهمان آزمایشی", phone: "۰۹۱۲ ۳۴۵ ۶۷۸۹", pin: "۱۲۳۴" },
        status: 202,
      });
      assert.equal(pending.data.member, undefined);
      const { data, response } = await request("/public/club/claims/verify", {
        method: "POST", cookie: cookieFrom(pending.response),
        body: { claimId: pending.data.claim.claimId, code: mockDeliveries.at(-1).code },
      });
      member = data.member;
      assert.equal(member.phone, "09123456789");
      assert.equal(member.points, 0);
      assert.equal(member.tier.id, "bronze");

      const rawCookie = response.headers.getSetCookie()[0];
      assert.match(rawCookie, /HttpOnly/i);
      assert.match(rawCookie, /SameSite=Lax/i);
      clubCookie = cookieFrom(response);
      assert.ok(clubCookie.startsWith("club_token="));

    });

    await t.test("login, dashboard and private endpoints require the session", async () => {
      await request("/public/club/me", { cookie: "", status: 401 });
      await request("/public/club/login", {
        method: "POST",
        body: { phone: "09123456789", pin: "9999" },
        status: 401,
      });
      const { data, response } = await request("/public/club/login", {
        method: "POST",
        cookie: "",
        body: { phone: "۰۹۱۲۳۴۵۶۷۸۹", pin: "1234" },
        status: 200,
      });
      assert.equal(data.member.id, member.id);
      clubCookie = cookieFrom(response);

      const dashboard = await request("/public/club/me", { status: 200 });
      assert.equal(dashboard.data.member.points, 0);
      assert.deepEqual(dashboard.data.transactions, []);
      assert.equal(dashboard.data.rewards[0].reason, "insufficient_points");
    });

    await t.test("review points are pending until moderation, then awarded once", async () => {
      product = await prisma.product.create({
        data: { name: "برگر آزمون باشگاه", price: "250000", stock: 5 },
      });
      const submitted = await request("/public/reviews", {
        method: "POST",
        body: {
          productId: product.id,
          authorName: "مهمان آزمایشی",
          rating: 5,
          body: "این نظر برای آزمون امتیاز باشگاه ثبت شده است.",
        },
        status: 201,
      });
      assert.equal(submitted.data.pointsPending, true);
      const reviewId = submitted.data.review.id;

      const adminLogin = await request("/auth/login", {
        method: "POST",
        cookie: "",
        body: { email: fixture.admin.email, password: fixture.password },
        status: 200,
      });
      adminToken = adminLogin.data.accessToken;

      const approved = await request(`/reviews/${reviewId}`, {
        method: "PATCH",
        cookie: "",
        token: adminToken,
        body: { status: "APPROVED" },
        status: 200,
      });
      assert.equal(approved.data.review.pointsAwarded, 50);

      // ویرایش دوبارهٔ همان نظر امتیاز تکراری نمی‌سازد.
      const edited = await request(`/reviews/${reviewId}`, {
        method: "PATCH",
        cookie: "",
        token: adminToken,
        body: { featured: true },
        status: 200,
      });
      assert.equal(edited.data.review.pointsAwarded, 0);

      const dashboard = await request("/public/club/me");
      assert.equal(dashboard.data.member.points, 50);
      assert.equal(dashboard.data.transactions.length, 1);
      assert.equal(dashboard.data.transactions[0].source, "review");
      assert.equal(dashboard.data.transactions[0].points, 50);
    });

    await t.test("order points use the paid amount and never double-apply", async () => {
      const paidOrder = await prisma.chatOrder.create({
        data: {
          orderNumber: `QA-CLUB-${Date.now()}`,
          customerName: "مهمان آزمایشی",
          customerPhone: "0912-345-6789",
          shippingAddress: "آدرس آزمایشی",
          status: "PAID",
          subtotalAmount: "1500000",
          totalAmount: "1500000",
        },
      });
      const first = await awardOrderPoints(paidOrder.id);
      const second = await awardOrderPoints(paidOrder.id);
      assert.equal(first.awarded, 150);
      assert.equal(second.awarded, 0);
      assert.equal(normalizePhone(paidOrder.customerPhone), "09123456789");

      const cancelled = await prisma.chatOrder.create({
        data: {
          orderNumber: `QA-CANCEL-${Date.now()}`,
          customerName: "مهمان آزمایشی",
          customerPhone: "09123456789",
          shippingAddress: "آدرس آزمایشی",
          status: "CANCELLED",
          subtotalAmount: "500000",
          totalAmount: "500000",
        },
      });
      assert.equal((await awardOrderPoints(cancelled.id)).awarded, 0);

      const dashboard = await request("/public/club/me");
      assert.equal(dashboard.data.member.points, 200);
      const orderTransaction = dashboard.data.transactions.find((row) => row.source === "order");
      assert.equal(orderTransaction.points, 150);
    });

    await t.test("reward availability reflects tier and points", async () => {
      const { data } = await request("/public/club/me");
      const byCode = Object.fromEntries(data.rewards.map((reward) => [reward.code, reward]));
      assert.equal(byCode["FRIES-ON-US"].reason, "ok");
      assert.equal(byCode["DRINK-ON-US"].reason, "ok");
      assert.equal(byCode["BURGER-OF-CHOICE"].reason, "tier_required");

      await prisma.clubReward.create({
        data: {
          code: `QA-GOLD-${randomUUID()}`,
          titleFa: "پاداش طلایی",
          titleEn: "Gold reward",
          costPoints: 10,
          minTier: "GOLD",
          sortOrder: 90,
        },
      });
      await prisma.clubReward.create({
        data: {
          code: `QA-EXPIRED-${randomUUID()}`,
          titleFa: "پاداش منقضی",
          titleEn: "Expired reward",
          costPoints: 10,
          expiresAt: new Date(Date.now() - 60_000),
          sortOrder: 91,
        },
      });

      const refreshed = await request("/public/club/me");
      const reasons = refreshed.data.rewards.map((reward) => reward.reason);
      assert.ok(reasons.includes("tier_required"));
      assert.ok(reasons.includes("expired"));
    });

    await t.test("redemption is atomic and idempotent", async () => {
      const { data: rewardsData } = await request("/public/club/me");
      const fries = rewardsData.rewards.find((reward) => reward.code === "FRIES-ON-US");
      const key = randomUUID();

      const first = await request(`/public/club/rewards/${fries.id}/redeem`, {
        method: "POST",
        body: { idempotencyKey: key },
        status: 201,
      });
      assert.equal(first.data.member.points, 100);
      assert.match(first.data.redemption.code, /^CLUB-[A-F0-9]{8}$/);

      const duplicate = await request(`/public/club/rewards/${fries.id}/redeem`, {
        method: "POST",
        body: { idempotencyKey: key },
        status: 200,
      });
      assert.equal(duplicate.data.duplicate, true);
      assert.equal(duplicate.data.member.points, 100);

      const invalidKey = await request(`/public/club/rewards/${fries.id}/redeem`, {
        method: "POST",
        body: { idempotencyKey: "bad" },
        status: 400,
      });
      assert.match(invalidKey.data.message, /شناسه/);

      await request(`/public/club/rewards/${fries.id}/redeem`, {
        method: "POST",
        cookie: "",
        body: { idempotencyKey: randomUUID() },
        status: 401,
      });
    });

    await t.test("concurrent redemptions cannot overspend or oversell stock", async () => {
      const paidOrder = await prisma.chatOrder.create({
        data: {
          orderNumber: `QA-CONCURRENT-${Date.now()}`,
          customerName: "مهمان آزمایشی",
          customerPhone: "09123456789",
          shippingAddress: "آدرس آزمایشی",
          status: "PAID",
          subtotalAmount: "300000",
          totalAmount: "300000",
        },
      });
      assert.equal((await awardOrderPoints(paidOrder.id)).awarded, 30);
      const before = (await request("/public/club/me")).data.member.points;
      assert.equal(before, 130);

      const stockReward = await prisma.clubReward.create({
        data: {
          code: `QA-STOCK-${randomUUID()}`,
          titleFa: "پاداش تک‌موجود",
          titleEn: "Single stock reward",
          costPoints: 100,
          stock: 1,
          sortOrder: 95,
        },
      });

      const redeem = (key) =>
        fetch(`${base}/public/club/rewards/${stockReward.id}/redeem`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Cookie: clubCookie,
            Origin: "http://localhost:5174",
          },
          body: JSON.stringify({ idempotencyKey: key }),
        });

      const responses = await Promise.all([redeem(randomUUID()), redeem(randomUUID())]);
      const statuses = responses.map((response) => response.status).sort();
      assert.deepEqual(statuses, [201, 400]);

      const after = await request("/public/club/me");
      assert.equal(after.data.member.points, 30);
      assert.equal(after.data.redemptions.length, 2);
      const refreshedStock = await prisma.clubReward.findUnique({ where: { id: stockReward.id } });
      assert.equal(refreshedStock.stock, 0);
      const outOfStockReward = after.data.rewards.find((reward) => reward.id === stockReward.id);
      assert.equal(outOfStockReward.reason, "out_of_stock");
    });

    await t.test("logout clears the club session", async () => {
      await request("/public/club/logout", { method: "POST", status: 204 });
      await request("/public/club/me", { cookie: "", status: 401 });
    });
  } finally {
    await new Promise((resolve) => server.close(resolve));
    await fixture.cleanup();
  }
});
