import test from "node:test";
import assert from "node:assert/strict";
import ExcelJS from "exceljs";
import { createFixture } from "./fixture.mjs";

test("club admin CRM validates inputs, audits actions, honors consent, and safely exports XLSX", async t => {
  const fixture = await createFixture();
  const { prisma } = await import("../src/config/prisma.js");
  const { default: app } = await import("../src/app.js");
  const { signAccessToken, signClubToken } = await import("../src/utils/tokens.js");
  const { digest } = await import("../src/services/otpService.js");
  const server = app.listen(0, "127.0.0.1");
  await new Promise(resolve => server.once("listening", resolve));
  const base = `http://127.0.0.1:${server.address().port}/api`;
  const adminToken = signAccessToken(fixture.admin);
  const staffToken = signAccessToken(fixture.staff);
  const call = async (path, { method = "GET", token = adminToken, body, cookie } = {}) => fetch(base + path, {
    method,
    headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(body ? { "Content-Type": "application/json" } : {}), ...(cookie ? { Cookie: cookie } : {}) },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const makeMember = (fields = {}) => {
    const phone = fields.phone ?? `0912${String(Math.floor(Math.random() * 1e7)).padStart(7, "0")}`;
    return prisma.clubMember.create({ data: { name: "CRM test member", ...fields, phone, pinHash: "test-only-hash", verificationStatus: "verified", verifiedPhone: phone, verifiedAt: new Date() } });
  };
  try {
    const member = await makeMember({ pointsBalance: 100, marketingConsent: true, marketingConsentAt: new Date() });

    await t.test("club-admin auth rejects anonymous users and STAFF", async () => {
      assert.equal((await call("/club-admin/members", { token: "" })).status, 401);
      assert.equal((await call("/club-admin/members", { token: staffToken })).status, 403);
      assert.equal((await call("/club-admin/members")).status, 200);
    });

    await t.test("malformed inputs on every club-admin route return 400", async () => {
      const cases = [
        ["/club-admin/members?page=bad"], ["/club-admin/members/export.xlsx?tier=bad"],
        ["/club-admin/nonmembers?page=0"], ["/club-admin/nonmembers/export.xlsx?consent=maybe"],
        [`/club-admin/members/${member.id}/points`, { method: "POST", body: {} }],
        [`/club-admin/members/${member.id}/consent`, { method: "PATCH", body: {} }],
        [`/club-admin/members/${member.id}/coupons`, { method: "POST", body: {} }],
        ["/club-admin/sms", { method: "POST", body: {} }],
      ];
      for (const [path, options] of cases) assert.equal((await call(path, options)).status, 400, path);
      assert.equal((await call("/club-admin/members/nonexistent")).status, 404);
    });

    await t.test("point adjustment writes the delta, reason, actor, and audit; negative balances are rejected", async () => {
      const response = await call(`/club-admin/members/${member.id}/points`, { method: "POST", body: { delta: 25, reason: "service recovery" } });
      assert.equal(response.status, 201);
      const row = await prisma.clubPointTransaction.findFirst({ where: { memberId: member.id, type: "ADJUST" } });
      assert.equal(row.points, 25); assert.equal(row.balanceAfter, 125); assert.equal(row.description, "service recovery");
      const audit = await prisma.securityAudit.findFirst({ where: { action: "club.points.adjusted", subject: digest(member.id) } });
      assert.equal(audit.details.actorId, fixture.admin.id); assert.equal(audit.details.delta, 25); assert.equal(audit.details.reason, "service recovery");
      assert.equal((await call(`/club-admin/members/${member.id}/points`, { method: "POST", body: { delta: -126, reason: "invalid debit" } })).status, 400);
      assert.equal((await call(`/club-admin/members/${member.id}/points`, { method: "POST", body: { delta: 0, reason: "zero delta" } })).status, 400);
    });

    await t.test("coupon issuance is member-exclusive and rejects an unknown member", async () => {
      const body = { discountType: "PERCENTAGE", discountValue: 10, expiresAt: new Date(Date.now() + 86400000).toISOString(), reason: "member reward" };
      const response = await call(`/club-admin/members/${member.id}/coupons`, { method: "POST", body });
      assert.equal(response.status, 201);
      const coupon = await prisma.coupon.findUnique({ where: { code: (await response.json()).code } });
      assert.equal(coupon.clubMemberId, member.id); assert.equal(coupon.maxUses, 1);
      assert.equal((await call("/club-admin/members/missing/coupons", { method: "POST", body })).status, 400);
    });

    await t.test("marketing queue contains only opted-in active members; withdrawal suppresses queued delivery", async () => {
      const other = await makeMember({ marketingConsent: false });
      const mixed = await call("/club-admin/sms", { method: "POST", body: { memberIds: [member.id, other.id], message: "club update", idempotencyKey: "consent-test-001" } });
      assert.equal(mixed.status, 400);
      const queued = await call("/club-admin/sms", { method: "POST", body: { memberIds: [member.id], message: "club update", idempotencyKey: "consent-test-002" } });
      assert.equal(queued.status, 202); assert.deepEqual(await queued.json(), { queued: 1 });
      const event = await prisma.securityOutbox.findUnique({ where: { key: `consent-test-002:${member.id}` } });
      assert.equal(event.status, "pending");
      await call(`/club-admin/members/${member.id}/consent`, { method: "PATCH", body: { allowed: false } });
      const { processSecurityOutbox } = await import("../src/services/securityJobs.js");
      const { mockDeliveries } = await import("../src/services/securityProviders.js");
      const before = mockDeliveries.length;
      await processSecurityOutbox({ dryRun: false, limit: 10 });
      const stopped = await prisma.securityOutbox.findUnique({ where: { id: event.id } });
      assert.equal(stopped.status, "completed");
      assert.equal(mockDeliveries.length, before);
      assert.ok(await prisma.securityAudit.findFirst({ where: { action: "club.marketing_sms.skipped_revoked", subject: digest(event.orderId) } }));
    });

    await t.test("member cancellation deactivates the account and invalidates its session", async () => {
      const cancellable = await makeMember({ marketingConsent: true });
      const cookie = `club_token=${signClubToken(cancellable)}`;
      const response = await call("/public/club/me", { method: "DELETE", token: "", cookie });
      assert.equal(response.status, 204);
      const saved = await prisma.clubMember.findUnique({ where: { id: cancellable.id } });
      assert.equal(saved.isActive, false); assert.equal(saved.marketingConsent, false); assert.equal(saved.tokenVersion, 1);
      assert.equal((await call("/public/club/me", { token: "", cookie })).status, 401);
    });

    await t.test("member and nonmember XLSX exports escape formula-leading cells", async () => {
      const expressions = ["=1+1", "+SUM(A1:A2)", "-1+2", "@cmd"];
      for (let index = 0; index < expressions.length; index++) await makeMember({ name: expressions[index], phone: `0922${String(index).padStart(7, "0")}` });
      const { exportClubMembers, exportNonMembers } = await import("../src/services/clubAdminService.js");
      const actor = fixture.admin;
      const memberBuffer = await exportClubMembers({}, actor);
      const memberWorkbook = new ExcelJS.Workbook(); await memberWorkbook.xlsx.load(memberBuffer);
      const memberValues = memberWorkbook.worksheets[0].getColumn(1).values.slice(2);
      for (const expression of expressions) assert.ok(memberValues.includes(`'${expression}`));

      const guestPhone = "09330000000";
      await prisma.chatOrder.create({ data: { orderNumber: `xlsx-${Date.now()}`, customerName: "=2+2", phoneHash: digest(guestPhone), customerPhone: guestPhone, shippingAddress: "test", status: "PAID", subtotalAmount: 1000, totalAmount: 1000 } });
      const guestBuffer = await exportNonMembers({}, actor);
      const guestWorkbook = new ExcelJS.Workbook(); await guestWorkbook.xlsx.load(guestBuffer);
      assert.equal(guestWorkbook.worksheets[0].getCell("A2").value, "'=2+2");
    });
  } finally {
    await new Promise(resolve => server.close(resolve));
    await fixture.cleanup();
  }
});
