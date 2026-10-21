import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { writeFile } from "node:fs/promises";
import { createFixture } from "./fixture.mjs";

test("SEC-006: verified phone ownership and quarantined points", async t => {
  const fixture = await createFixture({ beforeClubMigration: async client => {
    const { hashPassword } = await import("../src/utils/password.js");
    const hash = await hashPassword("1234");
    await client.$executeRaw`INSERT INTO club_members(id,phone,name,"pinHash","pointsBalance","updatedAt") VALUES ('legacy-test','09120000900','Legacy test',${hash},80,now())`;
    await client.$executeRaw`INSERT INTO club_point_transactions(id,"memberId",type,source,"sourceId",points,"balanceAfter") VALUES ('legacy-ledger','legacy-test','EARN','ORDER','legacy-order',80,80)`;
  } });
  const { prisma } = await import("../src/config/prisma.js");
  const ownership = await import("../src/services/clubOwnershipService.js");
  const club = await import("../src/services/clubService.js");
  const otp = await import("../src/services/otpService.js");
  const { mockDeliveries } = await import("../src/services/securityProviders.js");
  const { default: app } = await import("../src/app.js");
  const server = app.listen(0, "127.0.0.1");
  await new Promise(resolve => server.once("listening", resolve));
  const base = `http://127.0.0.1:${server.address().port}/api/public/club`;
  const results = [];
  let n = 0;
  async function check(name, fn) { await t.test(name, async () => { await fn(); results.push({ name, passed: true }); }); }
  async function claim(phone, actorId = randomUUID()) {
    const data = await ownership.createClubClaim({ phone, actorId, name: "Synthetic member", pin: "1234", ip: `192.0.2.${++n}` });
    return { ...data, actorId, code: mockDeliveries.at(-1).code };
  }
  async function verify(value, code = value.code, captchaToken) { return ownership.verifyClubClaim({ claimId: value.claimId, actorId: value.actorId, code, captchaToken }); }
  async function paid(phone) { return prisma.chatOrder.create({ data: { orderNumber: randomUUID(), customerName: "Test", customerPhone: phone, shippingAddress: "Test only", status: "PAID", subtotalAmount: 500000, totalAmount: 500000 } }); }
  async function age(phone) { await prisma.otpCode.updateMany({ where: { phoneHash: otp.digest(phone) }, data: { createdAt: new Date(Date.now() - 61000) } }); }
  try {
    let pending, order;
    await check("fabricated PIN creates only a claim; no owner, session or usable points", async () => {
      const phone = "09120000001";
      order = await paid(phone);
      assert.equal((await club.awardOrderPoints(order.id)).pending, 50);
      pending = await claim(phone);
      assert.equal(await prisma.clubMember.count({ where: { phone } }), 0);
      assert.equal(await prisma.clubPointTransaction.count({ where: { sourceId: order.id } }), 0);
      const row = await prisma.clubClaim.findUnique({ where: { id: pending.claimId } });
      assert.equal(row.status, "pending"); assert.notEqual(row.pinHash, "1234");
      await assert.rejects(club.loginClub({ phone, pin: "1234" }), e => e.statusCode === 401);
    });
    let member;
    await check("correct OTP releases only matching pending points exactly once; replay and actor swap fail", async () => {
      await assert.rejects(ownership.verifyClubClaim({ claimId: pending.claimId, actorId: randomUUID(), code: pending.code }));
      member = await verify(pending);
      assert.equal(member.verificationStatus, "verified"); assert.equal(member.pointsBalance, 50);
      assert.equal((await prisma.clubPointAccrual.findUnique({ where: { source_sourceId: { source: "ORDER", sourceId: order.id } } })).status, "available");
      await assert.rejects(verify(pending));
      assert.equal((await club.awardOrderPoints(order.id)).awarded, 0);
      assert.equal(await prisma.clubPointTransaction.count({ where: { sourceId: order.id } }), 1);
    });
    await check("second proven claimant becomes disputed with 409 and gets no points", async () => {
      await age(member.phone);
      const rival = await claim(member.phone);
      await assert.rejects(verify(rival), e => e.statusCode === 409 && e.code === "CLUB_OWNERSHIP_DISPUTED");
      assert.equal((await prisma.clubClaim.findUnique({ where: { id: rival.claimId } })).status, "disputed");
      assert.equal((await prisma.clubMember.findUnique({ where: { id: member.id } })).pointsBalance, 50);
    });
    await check("five wrong codes lock challenge; captcha after three and a durable alert", async () => {
      const value = await claim("09120000002");
      const wrong = value.code === "000000" ? "111111" : "000000";
      for (let i=0; i<3; i++) await assert.rejects(verify(value, wrong));
      await assert.rejects(verify(value), e => e.code === "CAPTCHA_REQUIRED");
      for (let i=0; i<2; i++) await assert.rejects(verify(value, wrong, "mock-captcha-ok"));
      await assert.rejects(verify(value, value.code, "mock-captcha-ok"));
      const row = await prisma.otpCode.findUnique({ where: { id: value.challengeId } });
      assert.equal(row.attempts, 5); assert.notEqual(row.codeHash, value.code);
      assert.ok(await prisma.securityOutbox.findUnique({ where: { key: `otp-alert:${row.id}` } }));
    });
    await check("different source mobile stays pending even when bound to a verified member", async () => {
      const other = await paid("09120000003");
      const result = await ownership.accrueClubPoints({ phone: other.customerPhone, memberId: member.id, source: "ORDER", sourceId: other.id, points: 50 });
      assert.equal(result.awarded, 0); assert.equal(result.pending, 50);
      assert.equal((await prisma.clubMember.findUnique({ where: { id: member.id } })).pointsBalance, 50);
      assert.equal(await prisma.clubPointTransaction.count({ where: { sourceId: other.id } }), 0);
    });
    await check("existing and absent mobiles receive identical generic responses and a claim cookie only", async () => {
      await age(member.phone);
      const observed = [];
      for (const phone of [member.phone, "09120000004"]) {
        const begin = performance.now();
        const response = await fetch(`${base}/join`, { method: "POST", headers: { "Content-Type": "application/json", Origin: "http://localhost:5174", "X-Forwarded-For": `192.0.2.${++n}` }, body: JSON.stringify({ phone, name: "Test member", pin: "1234" }) });
        assert.equal(response.status, 202);
        const data = await response.json();
        assert.equal(data.member, undefined);
        const cookies = response.headers.getSetCookie();
        assert.ok(cookies.some(c => c.startsWith("club_claim_actor=")));
        assert.ok(cookies.every(c => !c.startsWith("club_token=")));
        observed.push({ message: data.claim.message, expiresIn: data.claim.expiresIn, resendAfter: data.claim.resendAfter, ms: performance.now()-begin });
      }
      assert.deepEqual({ ...observed[0], ms:0 }, { ...observed[1], ms:0 });
      assert.ok(observed.every(r => r.ms >= 340));
      assert.ok(Math.abs(observed[0].ms - observed[1].ms) < 250, "response timing should share a fixed floor");
    });
    await check("two genuinely concurrent valid claims produce one verified owner", async () => {
      const phone = "09120000005";
      const first = await claim(phone); await age(phone);
      const second = await claim(phone);
      // Issuance normally invalidates the first code. Keep both independently
      // valid here to test the stronger ownership race, not issuance ordering.
      await prisma.otpCode.update({ where: { id: first.challengeId }, data: { consumedAt: null } });
      const outcomes = await Promise.allSettled([verify(first), verify(second)]);
      assert.equal(outcomes.filter(r => r.status === "fulfilled").length, 1);
      assert.equal(outcomes.find(r => r.status === "rejected").reason.statusCode, 409);
      assert.equal(await prisma.clubClaim.count({ where: { phone, status: "verified" } }), 1);
      assert.equal(await prisma.clubMember.count({ where: { phone, verificationStatus: "verified" } }), 1);
    });
    await check("actual legacy migration quarantines history; accrual continues, redemption denied, 30-day expiry is read-only", async () => {
      const legacy = await prisma.clubMember.findUnique({ where: { id: "legacy-test" } });
      assert.equal(legacy.verificationStatus, "legacy_unverified"); assert.equal(legacy.legacyPoints, 80); assert.equal(legacy.pointsBalance, 0); assert.equal(legacy.tokenVersion, 1);
      assert.ok(Math.abs(legacy.legacyUntil.getTime() - Date.now() - 30*86400000) < 120000);
      assert.equal((await prisma.clubPointTransaction.findUnique({ where: { id: "legacy-ledger" } })).status, "legacy_unverified");
      assert.ok(await prisma.securityOutbox.findUnique({ where: { key: "club-reverify:legacy-test" } }));
      await assert.rejects(club.redeemClubReward({ memberId: legacy.id, rewardId: "any", idempotencyKey: randomUUID() }), e => e.statusCode === 403);
      assert.equal((await club.awardOrderPoints((await paid(legacy.phone)).id)).pending, 50);
      await prisma.clubMember.update({ where: { id: legacy.id }, data: { legacyUntil: new Date(0) } });
      assert.equal((await club.awardOrderPoints((await paid(legacy.phone)).id)).readOnly, true);
      const proof = await claim(legacy.phone);
      const verified = await verify(proof);
      assert.equal(verified.pointsBalance, 130);
      assert.equal(await prisma.clubPointTransaction.count({ where: { sourceId: "legacy-release:legacy-test" } }), 1);
    });
    await check("clawback records a reason and adjustment once; ledger and security audit are immutable", async () => {
      const accrual = await prisma.clubPointAccrual.findUnique({ where: { source_sourceId: { source: "ORDER", sourceId: order.id } } });
      await assert.rejects(ownership.clawbackClubPoints({ accrualId: accrual.id, actorId: fixture.admin.id, reason: "bad" }));
      const args = { accrualId: accrual.id, actorId: fixture.admin.id, reason: "Synthetic fraudulent accrual" };
      const guest = await fetch(`${base}/points/${accrual.id}/clawback`, { method: "POST", headers: { "Content-Type": "application/json", Origin: "http://localhost:5174" }, body: JSON.stringify({ reason: args.reason }) });
      assert.equal(guest.status, 401);
      assert.equal((await ownership.clawbackClubPoints(args)).duplicate, false);
      assert.equal((await ownership.clawbackClubPoints(args)).duplicate, true);
      assert.equal((await prisma.clubMember.findUnique({ where: { id: member.id } })).pointsBalance, 0);
      const ledger = await prisma.clubPointTransaction.findFirst({ where: { sourceId: `clawback:${accrual.id}` } });
      assert.equal(ledger.points, -50); assert.equal(ledger.description, args.reason);
      await assert.rejects(prisma.clubPointTransaction.delete({ where: { id: ledger.id } }));
      const audit = await prisma.securityAudit.findFirst({ where: { action: "club.points_clawback" } });
      assert.equal(audit.details.actorId, fixture.admin.id);
      await assert.rejects(prisma.securityAudit.update({ where: { id: audit.id }, data: { action: "tampered" } }));
      assert.ok(!JSON.stringify(await prisma.securityAudit.findMany()).includes(pending.code));
    });
    await check("database constraints reject missing ownership proof and a second verified claim", async () => {
      await assert.rejects(prisma.clubMember.create({ data: { phone: "09120000009", name: "Invalid proof", pinHash: "synthetic-hash", verificationStatus: "verified", verifiedAt: new Date() } }));
      await assert.rejects(prisma.clubClaim.create({ data: { phone: member.phone, name: "Second owner", pinHash: "synthetic-hash", userId: randomUUID(), status: "verified", memberId: member.id, verifiedPhone: member.phone, verifiedAt: new Date() } }));
      const { stockMetrics } = await import("../src/services/securityJobs.js");
      const metrics = await stockMetrics();
      assert.ok(metrics.club.disputed >= 1); assert.ok(metrics.club.otpAlerts >= 1); assert.equal(metrics.alarm, true);
    });
    await check("OTP is scoped, expires, throttles resend and phone/IP daily issuance", async () => {
      const value = await claim("09120000006");
      await assert.rejects(otp.consumeOtp({ phone: "09120000006", subject: "checkout", challengeId: value.challengeId, code: value.code }));
      await assert.rejects(ownership.resendClubClaim({ claimId: value.claimId, actorId: value.actorId, ip: "192.0.2.201" }), e => e.statusCode === 429);
      await prisma.otpCode.update({ where: { id: value.challengeId }, data: { expiresAt: new Date(0) } });
      await assert.rejects(verify(value));
      const { env } = await import("../src/config/env.js");
      const oldPhone = env.OTP_DAILY_PHONE_LIMIT, oldIp = env.OTP_DAILY_IP_LIMIT;
      try {
        await age("09120000006"); env.OTP_DAILY_PHONE_LIMIT = 1;
        await assert.rejects(otp.requestOtp({ phone: "09120000006", subject: "club", ip: "192.0.2.202" }), e => e.statusCode === 429);
        env.OTP_DAILY_PHONE_LIMIT = oldPhone; env.OTP_DAILY_IP_LIMIT = 1;
        await otp.requestOtp({ phone: "09120000007", subject: "club", ip: "192.0.2.203" });
        await assert.rejects(otp.requestOtp({ phone: "09120000008", subject: "club", ip: "192.0.2.203" }), e => e.statusCode === 429);
      } finally { env.OTP_DAILY_PHONE_LIMIT = oldPhone; env.OTP_DAILY_IP_LIMIT = oldIp; }
    });
  } finally {
    await writeFile(new URL("../../../audit/evidence/sec006-after.json", import.meta.url), JSON.stringify({ timestamp: new Date(), environment: "Disposable loopback PostgreSQL; mock providers; no AI calls", independentVerification: false, tests: results }, null, 2));
    await new Promise(resolve => server.close(resolve));
    await fixture.cleanup();
  }
});
