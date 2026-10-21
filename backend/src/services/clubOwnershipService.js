import crypto from "node:crypto";
import { prisma } from "../config/prisma.js";
import { hashPassword } from "../utils/password.js";
import { AppError, BadRequestError, NotFoundError } from "../utils/AppError.js";
import { normalizeMobile, lockKeys, requestOtp, consumeOtp, securityAudit } from "./otpService.js";

export const claimResponse = { message: "در صورت امکان، کد تأیید به شماره موبایل ارسال می‌شود.", expiresIn: 300, resendAfter: 60 };

export async function createClubClaim({ phone: rawPhone, name, pin, actorId, ip, captchaToken }) {
  const phone = normalizeMobile(rawPhone);
  const normalizedPin = String(pin).replace(/[۰-۹]/g, d => String(d.charCodeAt(0)-0x6f0)).replace(/[٠-٩]/g,d => String(d.charCodeAt(0)-0x660));
  if (!/^\d{4,8}$/.test(normalizedPin) || typeof name !== "string" || name.trim().length < 2) throw new BadRequestError("اطلاعات عضویت معتبر نیست.");
  const id = crypto.randomUUID();
  const pinHash = await hashPassword(normalizedPin);
  // No lookup of club membership: an existing, absent or owned mobile follows
  // exactly the same request path. Possession is checked only by OTP.
  const challenge = await requestOtp({ phone, subject: "club", ip, captchaToken });
  await prisma.$transaction(async tx => {
    await lockKeys(tx, [`club:phone:${phone}`, `claim:${phone}:${actorId}`]);
    await tx.clubClaim.updateMany({ where: { phone, userId: actorId, status: "pending" }, data: { status: "rejected" } });
    await tx.clubClaim.create({ data: { id, phone, name: name.trim(), pinHash, userId: actorId, challengeId: challenge.challengeId } });
    await securityAudit(tx, "club.claim_created", phone, { claimId: id });
  });
  return { ...claimResponse, claimId: id, challengeId: challenge.challengeId };
}
export async function resendClubClaim({ claimId, actorId, ip, captchaToken }) {
  const claim = await prisma.clubClaim.findFirst({ where: { id: claimId, userId: actorId, status: { in: ["pending", "legacy_unverified"] } } });
  if (!claim) throw new NotFoundError("درخواست عضویت پیدا نشد.");
  const challenge = await requestOtp({ phone: claim.phone, subject: "club", ip, captchaToken });
  await prisma.$transaction(async tx => {
    await lockKeys(tx, [`club:phone:${claim.phone}`]);
    const updated = await tx.clubClaim.updateMany({ where: { id: claim.id, status: { in: ["pending", "legacy_unverified"] } }, data: { challengeId: challenge.challengeId } });
    if (!updated.count) throw new BadRequestError("درخواست تأیید معتبر نیست.");
  });
  return { ...claimResponse, claimId: claim.id, challengeId: challenge.challengeId };
}

export async function releaseAccruals(tx, member, now = new Date()) {
  if (member.verificationStatus !== "verified" || member.verifiedPhone !== member.phone) return 0;
  const rows = await tx.clubPointAccrual.findMany({ where: { phone: member.verifiedPhone, status: "pending", OR: [{ memberId: null }, { memberId: member.id }] }, orderBy: { id: "asc" } });
  let released = 0;
  for (const row of rows) {
    // Match source phone again at release time; a member-bound accrual alone
    // never proves that an order or review used the verified mobile.
    const source = row.source === "ORDER" ? await tx.chatOrder.findUnique({ where: { id: row.sourceId } }) : await tx.review.findUnique({ where: { id: row.sourceId } });
    const sourcePhone = row.source === "ORDER" ? source?.customerPhone : source?.authorPhone;
    let matches = false;
    try { matches = normalizeMobile(sourcePhone) === member.verifiedPhone; } catch { /* missing source stays pending */ }
    if (!matches || (row.source === "ORDER" && !["PAID", "CONFIRMED", "PROCESSING", "SHIPPED", "DELIVERED"].includes(source.status)) || (row.source === "REVIEW" && source.status !== "APPROVED")) continue;
    const changed = await tx.clubPointAccrual.updateMany({ where: { id: row.id, status: "pending" }, data: { status: "available", memberId: member.id, releasedAt: now } });
    if (!changed.count) continue;
    const updated = await tx.clubMember.update({ where: { id: member.id }, data: { pointsBalance: { increment: row.points } } });
    await tx.clubPointTransaction.create({ data: { memberId: member.id, type: "EARN", source: row.source, sourceId: row.sourceId, points: row.points, balanceAfter: updated.pointsBalance, description: row.description } });
    released += row.points;
  }
  return released;
}

export async function verifyClubClaim({ claimId, actorId, code, captchaToken }) {
  const claim = await prisma.clubClaim.findFirst({ where: { id: claimId, userId: actorId } });
  if (!claim || !["pending", "legacy_unverified"].includes(claim.status)) throw new BadRequestError("درخواست تأیید معتبر نیست.");
  try { await consumeOtp({ phone: claim.phone, challengeId: claim.challengeId, subject: "club", code, captchaToken }); }
  catch (error) {
    await prisma.clubClaim.update({ where: { id: claim.id }, data: { attemptCount: { increment: 1 } } });
    throw error;
  }
  const result = await prisma.$transaction(async tx => {
    await lockKeys(tx, [`club:phone:${claim.phone}`]);
    const current = await tx.clubClaim.findUnique({ where: { id: claim.id } });
    if (!current || !["pending", "legacy_unverified"].includes(current.status) || current.challengeId !== claim.challengeId) throw new BadRequestError("درخواست تأیید تغییر کرده است؛ دوباره کد بگیرید.");
    const owner = await tx.clubClaim.findFirst({ where: { phone: claim.phone, status: "verified" } });
    if (owner && owner.id !== claim.id) {
      await tx.clubClaim.update({ where: { id: claim.id }, data: { status: "disputed", attemptCount: { increment: 1 } } });
      await securityAudit(tx, "club.ownership_disputed", claim.phone, { claimId: claim.id });
      return { conflict: true };
    }
    const now = new Date();
    const existing = await tx.clubMember.findUnique({ where: { phone: claim.phone } });
    if (existing?.verificationStatus === "verified") {
      await tx.clubClaim.update({ where: { id: claim.id }, data: { status: "disputed" } });
      await securityAudit(tx, "club.ownership_disputed", claim.phone, { claimId: claim.id });
      return { conflict: true };
    }
    const member = await tx.clubMember.upsert({ where: { phone: claim.phone }, create: { phone: claim.phone, name: claim.name, pinHash: claim.pinHash, verificationStatus: "verified", verifiedPhone: claim.phone, verifiedAt: now, lastLoginAt: now },
      update: { name: claim.name, pinHash: claim.pinHash, verificationStatus: "verified", verifiedPhone: claim.phone, verifiedAt: now, lastLoginAt: now, tokenVersion: { increment: 1 } } });
    await tx.clubClaim.update({ where: { id: claim.id }, data: { status: "verified", verifiedPhone: claim.phone, verifiedAt: now, memberId: member.id, attemptCount: { increment: 1 } } });
    if (existing?.legacyPoints > 0 && !existing.legacyReleasedAt) {
      // Keep historical rows intact and add a traceable release adjustment.
      const balance = await tx.clubMember.update({ where: { id: member.id }, data: { pointsBalance: { increment: existing.legacyPoints }, legacyReleasedAt: now } });
      await tx.clubPointTransaction.create({ data: { memberId: member.id, type: "ADJUST", source: "ADJUSTMENT", sourceId: `legacy-release:${member.id}`, points: existing.legacyPoints, balanceAfter: balance.pointsBalance, description: "Legacy balance released after mobile OTP verification" } });
    }
    await releaseAccruals(tx, member, now);
    await securityAudit(tx, "club.ownership_verified", claim.phone, { claimId: claim.id, memberId: member.id });
    return { member: await tx.clubMember.findUnique({ where: { id: member.id } }) };
  }, { timeout: 15000 });
  if (result.conflict) throw new AppError("این شماره مالک تأییدشده دارد. برای اعتراض، کارت باشگاه یا فاکتور را به پشتیبانی ارائه کنید یا حضوری مراجعه کنید.", 409, "CLUB_OWNERSHIP_DISPUTED");
  return result.member;
}

export async function accrueClubPoints({ phone: rawPhone, memberId = null, source, sourceId, points, description }) {
  if (!Number.isInteger(points) || points < 1) return { awarded: 0, pending: 0 };
  let phone;
  try { phone = normalizeMobile(rawPhone); } catch { return { awarded: 0, pending: 0 }; }
  return prisma.$transaction(async tx => {
    await lockKeys(tx, [`club:phone:${phone}`]);
    const member = memberId ? await tx.clubMember.findUnique({ where: { id: memberId } }) : await tx.clubMember.findUnique({ where: { phone } });
    if (member?.verificationStatus === "legacy_unverified" && member.legacyUntil && member.legacyUntil <= new Date()) return { awarded: 0, pending: 0, readOnly: true };
    const prior = await tx.clubPointAccrual.findUnique({ where: { source_sourceId: { source, sourceId } } });
    if (prior) return { awarded: 0, pending: prior.status === "pending" ? prior.points : 0, duplicate: true };
    // Existing historical ledger entries must not be earned a second time.
    if (await tx.clubPointTransaction.findFirst({ where: { source, sourceId } })) return { awarded: 0, pending: 0, duplicate: true };
    const accrual = await tx.clubPointAccrual.create({ data: { phone, memberId: member?.id ?? null, source, sourceId, points, description } });
    const awarded = member ? await releaseAccruals(tx, member) : 0;
    return { awarded, pending: awarded ? 0 : accrual.points, balanceAfter: member ? (await tx.clubMember.findUnique({ where: { id: member.id } })).pointsBalance : null };
  });
}

export async function clawbackClubPoints({ accrualId, reason, actorId }) {
  if (typeof reason !== "string" || reason.trim().length < 5) throw new BadRequestError("دلیل بازپس‌گیری لازم است.");
  return prisma.$transaction(async tx => {
    const initial = await tx.clubPointAccrual.findUnique({ where: { id: accrualId } });
    if (!initial) throw new NotFoundError();
    await lockKeys(tx, [`club:phone:${initial.phone}`]);
    const row = await tx.clubPointAccrual.findUnique({ where: { id: accrualId } });
    if (row.status === "clawed_back") return { duplicate: true };
    if (row.status === "available") {
      const updated = await tx.clubMember.updateMany({ where: { id: row.memberId, pointsBalance: { gte: row.points } }, data: { pointsBalance: { decrement: row.points } } });
      if (!updated.count) throw new AppError("امتیاز مصرف شده؛ نیازمند بررسی دستی است.", 409, "CLAWBACK_REQUIRES_REVIEW");
      const member = await tx.clubMember.findUnique({ where: { id: row.memberId } });
      await tx.clubPointTransaction.create({ data: { memberId: row.memberId, source: "ADJUSTMENT", sourceId: `clawback:${row.id}`, type: "ADJUST", points: -row.points, balanceAfter: member.pointsBalance, description: reason.trim() } });
    }
    await tx.clubPointAccrual.update({ where: { id: row.id }, data: { status: "clawed_back" } });
    await securityAudit(tx, "club.points_clawback", row.phone, { accrualId, reason: reason.trim(), actorId });
    return { duplicate: false };
  });
}
