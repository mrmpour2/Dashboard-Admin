import { prisma } from "../config/prisma.js";
import { NotFoundError, ConflictError, BadRequestError } from "../utils/AppError.js";

export async function listCoupons({ page, pageSize, isActive }) {
  const where = { ...(isActive !== undefined && { isActive }) };

  const [items, total] = await Promise.all([
    prisma.coupon.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.coupon.count({ where }),
  ]);

  return {
    items,
    pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
  };
}

export async function getCouponById(id) {
  const coupon = await prisma.coupon.findUnique({ where: { id } });
  if (!coupon) throw new NotFoundError("کد تخفیف یافت نشد");
  return coupon;
}

export async function createCoupon(data) {
  const existing = await prisma.coupon.findUnique({ where: { code: data.code } });
  if (existing) throw new ConflictError("کدی با این نام از قبل وجود دارد");

  return prisma.coupon.create({ data });
}

export async function updateCoupon(id, data) {
  const current = await getCouponById(id);
  if ((data.discountType || current.discountType) === "PERCENTAGE" && Number(data.discountValue ?? current.discountValue) > 100) throw new BadRequestError("درصد تخفیف نمی‌تواند بیشتر از ۱۰۰ باشد");
  if (data.code) {
    const existing = await prisma.coupon.findUnique({ where: { code: data.code } });
    if (existing && existing.id !== id) {
      throw new ConflictError("کدی با این نام از قبل وجود دارد");
    }
  }

  const coupon = await prisma.coupon.update({ where: { id }, data }).catch(() => null);
  if (!coupon) throw new NotFoundError("کد تخفیف یافت نشد");
  return coupon;
}

export async function deleteCoupon(id) {
  const deleted = await prisma.coupon.delete({ where: { id } }).catch(() => null);
  if (!deleted) throw new NotFoundError("کد تخفیف یافت نشد");
}

// این تابع توسط orderService هنگام ثبت سفارش استفاده می‌شود تا یک کد تخفیف
// را نسبت به مبلغ سفارش اعتبارسنجی و مبلغ تخفیف واقعی را محاسبه کند.
// عمداً از throw کردن خطای BadRequestError استفاده می‌کند (نه NotFoundError)
// چون از دید ثبت‌کننده سفارش، این یک خطای ورودی نامعتبر است، نه یک منبع گم‌شده.
export async function resolveCouponForOrder(code, subtotal, tx = prisma) {
  const coupon = await tx.coupon.findUnique({ where: { code: code.trim().toUpperCase() } });

  if (!coupon) throw new BadRequestError("کد تخفیف یافت نشد");
  if (!coupon.isActive) throw new BadRequestError("این کد تخفیف غیرفعال است");
  if (coupon.expiresAt && coupon.expiresAt < new Date()) {
    throw new BadRequestError("این کد تخفیف منقضی شده است");
  }
  if (coupon.maxUses !== null && coupon.usedCount >= coupon.maxUses) {
    throw new BadRequestError("سقف استفاده از این کد تخفیف پر شده است");
  }
  if (coupon.minOrderAmount && subtotal < Number(coupon.minOrderAmount)) {
    throw new BadRequestError(
      `این کد تخفیف فقط برای سفارش‌های حداقل ${Number(coupon.minOrderAmount).toLocaleString("fa-IR")} تومان معتبر است`,
    );
  }

  const rawDiscount =
    coupon.discountType === "PERCENTAGE"
      ? (subtotal * Number(coupon.discountValue)) / 100
      : Number(coupon.discountValue);

  // مبلغ تخفیف هرگز نمی‌تواند از خود مبلغ سفارش بیشتر شود (جلوگیری از مجموع منفی)
  const discountAmount = Math.round(Math.min(rawDiscount, subtotal) * 100) / 100;

  return { coupon, discountAmount };
}
