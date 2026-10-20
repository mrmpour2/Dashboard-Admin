import crypto from "node:crypto";
import { prisma } from "../config/prisma.js";
import { isProd } from "../config/env.js";
import { comparePassword, hashPassword } from "../utils/password.js";
import {
  BadRequestError,
  ConflictError,
  NotFoundError,
  UnauthorizedError,
} from "../utils/AppError.js";

/**
 * باشگاه مشتریان.
 *
 * همهٔ تصمیم‌های مالی (موجودی، سطح، شرایط پاداش) در همین ماژول و روی دیتابیس
 * انجام می‌شوند؛ کلاینت فقط ورودی می‌فرستد و پاسخ نهایی را نشان می‌دهد.
 *
 *   - موجودی: `ClubMember.pointsBalance`
 *   - دفتر تغییرات: `ClubPointTransaction` با کلید یکتای (عضو، منبع، شناسه)
 *   - کاتالوگ: `ClubReward`
 *   - استرداد: `ClubRedemption` با کلید یکتای idempotencyKey
 */

export const CLUB_COOKIE_NAME = "club_token";
/** عمر نشست عضو؛ کوکی HttpOnly است و توکن در دسترس جاوااسکریپت قرار نمی‌گیرد. */
export const CLUB_SESSION_DAYS = 30;
export const CLUB_COOKIE_OPTIONS = {
  httpOnly: true,
  sameSite: "lax",
  secure: isProd,
  path: "/api/public",
  maxAge: CLUB_SESSION_DAYS * 24 * 60 * 60 * 1000,
};

export const POINTS_PER_TOMAN = 10_000;
export const POINTS_PER_REVIEW = 50;

/** آستانه‌های سطح؛ باید با `loyaltyTiers` در وب‌سایت یکسان بمانند. */
export const CLUB_TIERS = [
  { id: "bronze", db: "BRONZE", threshold: 0 },
  { id: "silver", db: "SILVER", threshold: 500 },
  { id: "gold", db: "GOLD", threshold: 1500 },
];

const PERSIAN_DIGITS = /[\u06F0-\u06F9]/g;
const ARABIC_DIGITS = /[\u0660-\u0669]/g;
const PHONE_PATTERN = /^\+?\d{8,15}$/;
const PIN_PATTERN = /^\d{4,8}$/;
const IDEMPOTENCY_PATTERN = /^[A-Za-z0-9_-]{8,128}$/;

/** ارقام فارسی/عربی → لاتین، حذف جداکننده‌ها؛ همان قاعدهٔ `utils/phone.ts` سایت. */
export function normalizePhone(value) {
  if (typeof value !== "string") return "";
  return value
    .replace(PERSIAN_DIGITS, (digit) => String(digit.charCodeAt(0) - 0x06f0))
    .replace(ARABIC_DIGITS, (digit) => String(digit.charCodeAt(0) - 0x0660))
    .replace(/[\s()\-\u200c]/g, "")
    .trim();
}

export function normalizePin(value) {
  if (typeof value !== "string") return "";
  return value
    .replace(PERSIAN_DIGITS, (digit) => String(digit.charCodeAt(0) - 0x06f0))
    .replace(ARABIC_DIGITS, (digit) => String(digit.charCodeAt(0) - 0x0660))
    .trim();
}

function assertPhone(phone) {
  if (!PHONE_PATTERN.test(phone)) {
    throw new BadRequestError("شماره موبایل معتبر وارد کنید.");
  }
}

function assertPin(pin) {
  if (!PIN_PATTERN.test(pin)) {
    throw new BadRequestError("رمز عضویت باید ۴ تا ۸ رقم باشد.");
  }
}

function tierIndexForPoints(points) {
  const safe = Number.isFinite(points) ? Math.max(0, points) : 0;
  let index = 0;
  CLUB_TIERS.forEach((tier, position) => {
    if (safe >= tier.threshold) index = position;
  });
  return index;
}

function tierRank(dbTier) {
  const index = CLUB_TIERS.findIndex((tier) => tier.db === dbTier);
  return index < 0 ? 0 : index;
}

/** سطح فعلی، سطح بعدی و درصد پیشرفت — همه از موجودی سرور. */
export function tierSnapshot(points) {
  const safe = Number.isFinite(points) ? Math.max(0, points) : 0;
  const index = tierIndexForPoints(safe);
  const current = CLUB_TIERS[index];
  const next = CLUB_TIERS[index + 1] ?? null;
  const span = next ? next.threshold - current.threshold : 0;
  return {
    id: current.id,
    threshold: current.threshold,
    nextTier: next?.id ?? null,
    nextThreshold: next?.threshold ?? null,
    pointsToNext: next ? Math.max(0, next.threshold - safe) : 0,
    progress: next ? Math.min(1, Math.max(0, (safe - current.threshold) / span)) : 1,
  };
}

/** شکل عمومی عضو؛ هیچ فیلد حساسی (pinHash، tokenVersion) بیرون نمی‌رود. */
export function toMemberView(member) {
  return {
    id: member.id,
    name: member.name,
    phone: member.phone,
    points: member.pointsBalance,
    joinedAt: member.joinedAt instanceof Date ? member.joinedAt.toISOString() : member.joinedAt,
    lastLoginAt:
      member.lastLoginAt instanceof Date ? member.lastLoginAt.toISOString() : member.lastLoginAt,
    tier: tierSnapshot(member.pointsBalance),
  };
}

function toRewardView(reward, member = null) {
  const now = Date.now();
  const expired = Boolean(reward.expiresAt && reward.expiresAt.getTime() <= now);
  const outOfStock = reward.stock !== null && reward.stock <= 0;
  const memberRank = member ? tierIndexForPoints(member.pointsBalance) : -1;
  const requiredRank = tierRank(reward.minTier);

  let reason = "ok";
  if (!reward.isActive) reason = "inactive";
  else if (expired) reason = "expired";
  else if (outOfStock) reason = "out_of_stock";
  else if (!member) reason = "login_required";
  else if (memberRank < requiredRank) reason = "tier_required";
  else if (member.pointsBalance < reward.costPoints) reason = "insufficient_points";

  return {
    id: reward.id,
    code: reward.code,
    titleFa: reward.titleFa,
    titleEn: reward.titleEn,
    descriptionFa: reward.descriptionFa,
    descriptionEn: reward.descriptionEn,
    costPoints: reward.costPoints,
    minTier: reward.minTier.toLowerCase(),
    stock: reward.stock,
    expiresAt: reward.expiresAt ? reward.expiresAt.toISOString() : null,
    canRedeem: reason === "ok",
    reason,
  };
}

function toTransactionView(transaction) {
  return {
    id: transaction.id,
    type: transaction.type.toLowerCase(),
    source: transaction.source.toLowerCase(),
    points: transaction.points,
    balanceAfter: transaction.balanceAfter,
    description: transaction.description,
    createdAt: transaction.createdAt.toISOString(),
  };
}

function toRedemptionView(redemption) {
  return {
    id: redemption.id,
    code: redemption.code,
    pointsSpent: redemption.pointsSpent,
    status: redemption.status.toLowerCase(),
    createdAt: redemption.createdAt.toISOString(),
    fulfilledAt: redemption.fulfilledAt ? redemption.fulfilledAt.toISOString() : null,
    reward: redemption.reward
      ? {
          id: redemption.reward.id,
          code: redemption.reward.code,
          titleFa: redemption.reward.titleFa,
          titleEn: redemption.reward.titleEn,
        }
      : null,
  };
}

/** عضویت تازه. شمارهٔ تکراری خطای ۴۰۹ می‌گیرد تا عضویت قبلی بازنویسی نشود. */
export async function joinClub({ phone, name, pin }) {
  const normalizedPhone = normalizePhone(phone);
  const normalizedPin = normalizePin(pin);
  assertPhone(normalizedPhone);
  assertPin(normalizedPin);

  const existing = await prisma.clubMember.findUnique({ where: { phone: normalizedPhone } });
  if (existing) {
    throw new ConflictError("این شماره قبلاً در باشگاه ثبت شده است؛ با رمز عضویت وارد شوید.");
  }

  const pinHash = await hashPassword(normalizedPin);
  try {
    return await prisma.clubMember.create({
      data: {
        phone: normalizedPhone,
        name: name.trim(),
        pinHash,
        lastLoginAt: new Date(),
      },
    });
  } catch (error) {
    // دو درخواست هم‌زمان برای یک شماره؛ دومی نباید رکورد تازه بسازد.
    if (error.code === "P2002") {
      throw new ConflictError("این شماره قبلاً در باشگاه ثبت شده است؛ با رمز عضویت وارد شوید.");
    }
    throw error;
  }
}

/** ورود با شماره و رمز. پیام خطا عمداً وجود/نبود شماره را لو نمی‌دهد. */
export async function loginClub({ phone, pin }) {
  const normalizedPhone = normalizePhone(phone);
  const normalizedPin = normalizePin(pin);
  assertPhone(normalizedPhone);
  assertPin(normalizedPin);

  const member = await prisma.clubMember.findUnique({ where: { phone: normalizedPhone } });
  if (!member) throw new UnauthorizedError("شماره موبایل یا رمز عضویت درست نیست.");
  const valid = await comparePassword(normalizedPin, member.pinHash);
  if (!valid) throw new UnauthorizedError("شماره موبایل یا رمز عضویت درست نیست.");

  return prisma.clubMember.update({
    where: { id: member.id },
    data: { lastLoginAt: new Date() },
  });
}

export async function getClubDashboard(member) {
  const [fresh, transactions, redemptions] = await Promise.all([
    prisma.clubMember.findUnique({ where: { id: member.id } }),
    prisma.clubPointTransaction.findMany({
      where: { memberId: member.id },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
    prisma.clubRedemption.findMany({
      where: { memberId: member.id },
      orderBy: { createdAt: "desc" },
      take: 10,
      include: { reward: { select: { id: true, code: true, titleFa: true, titleEn: true } } },
    }),
  ]);

  if (!fresh) throw new UnauthorizedError("عضویت پیدا نشد؛ دوباره وارد شوید.");

  return {
    member: toMemberView(fresh),
    transactions: transactions.map(toTransactionView),
    redemptions: redemptions.map(toRedemptionView),
    rewards: await listClubRewards(fresh),
  };
}

/** فهرست پاداش‌های قابل نمایش + دلیل واقعی قابل دریافت نبودن. */
export async function listClubRewards(member = null) {
  const rewards = await prisma.clubReward.findMany({
    where: { isActive: true },
    orderBy: [{ sortOrder: "asc" }, { costPoints: "asc" }],
  });
  return rewards.map((reward) => toRewardView(reward, member));
}

function newRedemptionCode() {
  return `CLUB-${crypto.randomBytes(4).toString("hex").toUpperCase()}`;
}

/**
 * استرداد پاداش.
 *
 * مسیر امن:
 *   1. امتیاز و موجودی پاداش با update شرطی (`gte` / `gt`) کم می‌شوند تا دو
 *      درخواست هم‌زمان نتوانند از یک موجودی دوبار خرج کنند.
 *   2. کاهش امتیاز، کاهش موجودی، ساخت کد و ثبت دفتر در یک تراکنش دیتابیس‌اند.
 *   3. `idempotencyKey` یکتاست؛ ارسال دوباره همان درخواست همان نتیجه را می‌دهد.
 */
export async function redeemClubReward({ memberId, rewardId, idempotencyKey }) {
  if (!IDEMPOTENCY_PATTERN.test(idempotencyKey ?? "")) {
    throw new BadRequestError("شناسهٔ درخواست معتبر نیست؛ صفحه را تازه کنید.");
  }

  const existing = await prisma.clubRedemption.findUnique({
    where: { memberId_idempotencyKey: { memberId, idempotencyKey } },
    include: { reward: { select: { id: true, code: true, titleFa: true, titleEn: true } } },
  });
  if (existing) {
    const member = await prisma.clubMember.findUnique({ where: { id: memberId } });
    return {
      duplicate: true,
      redemption: toRedemptionView(existing),
      member: member ? toMemberView(member) : null,
    };
  }

  let lastError;
  // برخورد بسیار کم‌احتمال کد یکتا؛ یک بار با کد تازه دوباره تلاش می‌شود.
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      const result = await prisma.$transaction(async (tx) => {
        const member = await tx.clubMember.findUnique({ where: { id: memberId } });
        if (!member) throw new UnauthorizedError("عضویت پیدا نشد؛ دوباره وارد شوید.");

        const reward = await tx.clubReward.findUnique({ where: { id: rewardId } });
        if (!reward || !reward.isActive) throw new NotFoundError("این پاداش در دسترس نیست.");
        if (reward.expiresAt && reward.expiresAt.getTime() <= Date.now()) {
          throw new BadRequestError("این پاداش منقضی شده است.");
        }
        if (tierIndexForPoints(member.pointsBalance) < tierRank(reward.minTier)) {
          throw new BadRequestError("این پاداش برای سطح بالاتری از عضویت است.");
        }
        if (member.pointsBalance < reward.costPoints) {
          throw new BadRequestError("امتیاز کافی برای دریافت این پاداش ندارید.");
        }

        if (reward.stock !== null) {
          const stockUpdate = await tx.clubReward.updateMany({
            where: { id: reward.id, isActive: true, stock: { gt: 0 } },
            data: { stock: { decrement: 1 } },
          });
          if (stockUpdate.count !== 1) {
            throw new BadRequestError("موجودی این پاداش تمام شده است.");
          }
        }

        const deducted = await tx.clubMember.updateMany({
          where: { id: memberId, pointsBalance: { gte: reward.costPoints } },
          data: { pointsBalance: { decrement: reward.costPoints } },
        });
        if (deducted.count !== 1) {
          throw new BadRequestError("موجودی امتیاز شما کافی نیست.");
        }

        const updated = await tx.clubMember.findUnique({ where: { id: memberId } });
        const redemption = await tx.clubRedemption.create({
          data: {
            memberId,
            rewardId: reward.id,
            code: newRedemptionCode(),
            pointsSpent: reward.costPoints,
            idempotencyKey,
          },
          include: { reward: { select: { id: true, code: true, titleFa: true, titleEn: true } } },
        });

        await tx.clubPointTransaction.create({
          data: {
            memberId,
            type: "REDEEM",
            source: "REWARD",
            sourceId: redemption.id,
            points: -reward.costPoints,
            balanceAfter: updated.pointsBalance,
            description: reward.code,
          },
        });

        return { redemption, member: updated };
      });

      return {
        duplicate: false,
        redemption: toRedemptionView(result.redemption),
        member: toMemberView(result.member),
      };
    } catch (error) {
      lastError = error;
      if (error.code === "P2002") {
        // همان کلید هم‌زمان ثبت شده است؛ نتیجهٔ ثبت‌شده برگردانده می‌شود.
        const duplicate = await prisma.clubRedemption.findUnique({
          where: { memberId_idempotencyKey: { memberId, idempotencyKey } },
          include: { reward: { select: { id: true, code: true, titleFa: true, titleEn: true } } },
        });
        if (duplicate) {
          const member = await prisma.clubMember.findUnique({ where: { id: memberId } });
          return {
            duplicate: true,
            redemption: toRedemptionView(duplicate),
            member: member ? toMemberView(member) : null,
          };
        }
      }
    }
  }

  throw lastError;
}

/** ثبت امتیاز با دفتر یکتا. اگر قبلاً ثبت شده باشد چیزی اضافه نمی‌شود. */
async function awardPoints({ memberId, points, source, sourceId, description }) {
  if (!Number.isInteger(points) || points < 1) return { awarded: 0, balanceAfter: null };

  try {
    return await prisma.$transaction(async (tx) => {
      const existing = await tx.clubPointTransaction.findUnique({
        where: { memberId_source_sourceId: { memberId, source, sourceId } },
      });
      if (existing) {
        return { awarded: 0, balanceAfter: existing.balanceAfter, duplicate: true };
      }

      const member = await tx.clubMember.update({
        where: { id: memberId },
        data: { pointsBalance: { increment: points } },
      });

      await tx.clubPointTransaction.create({
        data: {
          memberId,
          type: "EARN",
          source,
          sourceId,
          points,
          balanceAfter: member.pointsBalance,
          description,
        },
      });

      return { awarded: points, balanceAfter: member.pointsBalance, duplicate: false };
    });
  } catch (error) {
    // درخواست هم‌زمان دیگری همین منبع را ثبت کرده است.
    if (error.code === "P2002") {
      const existing = await prisma.clubPointTransaction.findUnique({
        where: { memberId_source_sourceId: { memberId, source, sourceId } },
      });
      return {
        awarded: 0,
        balanceAfter: existing?.balanceAfter ?? null,
        duplicate: true,
      };
    }
    if (error.code === "P2025") return { awarded: 0, balanceAfter: null };
    throw error;
  }
}

/**
 * امتیاز سفارش فقط وقتی ثبت می‌شود که سفارش واقعاً `PAID` باشد. سفارش لغوشده
 * یا در انتظار پرداخت هیچ امتیازی نمی‌گیرد. مبلغ از دیتابیس خوانده می‌شود.
 */
export async function awardOrderPoints(orderId) {
  const order = await prisma.chatOrder.findUnique({
    where: { id: orderId },
    select: { id: true, status: true, customerPhone: true, totalAmount: true, orderNumber: true },
  });
  if (!order || order.status !== "PAID") return { awarded: 0, balanceAfter: null };

  const phone = normalizePhone(order.customerPhone);
  if (!phone) return { awarded: 0, balanceAfter: null };

  const member = await prisma.clubMember.findUnique({ where: { phone }, select: { id: true } });
  if (!member) return { awarded: 0, balanceAfter: null };

  const points = Math.floor(Number(order.totalAmount) / POINTS_PER_TOMAN);
  return awardPoints({
    memberId: member.id,
    points,
    source: "ORDER",
    sourceId: order.id,
    description: order.orderNumber,
  });
}

/**
 * امتیاز نظر فقط برای عضوی ثبت می‌شود که با همان کوکی نشست وارد شده باشد؛
 * شمارهٔ فرم به‌تنهایی مرجع نیست تا کسی با شمارهٔ دیگری امتیاز نگیرد.
 */
export async function awardReviewPoints(reviewId, memberId) {
  if (!memberId) return { awarded: 0, balanceAfter: null };
  return awardPoints({
    memberId,
    points: POINTS_PER_REVIEW,
    source: "REVIEW",
    sourceId: reviewId,
    description: reviewId,
  });
}
