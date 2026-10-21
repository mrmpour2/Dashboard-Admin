import { prisma } from "../config/prisma.js";
import { NotFoundError, ForbiddenError, ConflictError, UnauthorizedError } from "../utils/AppError.js";
import { hashPassword, comparePassword } from "../utils/password.js";

const publicSelect = {
  id: true,
  name: true,
  email: true,
  role: true,
  status: true,
  avatarUrl: true,
  lastLoginAt: true,
  createdAt: true,
};

export async function changePassword(id, { currentPassword, newPassword }) {
  const user = await prisma.user.findUnique({ where: { id } });
  if (!user || !(await comparePassword(currentPassword, user.passwordHash))) {
    throw new UnauthorizedError("رمز عبور فعلی اشتباه است");
  }
  const passwordHash = await hashPassword(newPassword);
  await prisma.$transaction([
    prisma.user.update({ where: { id }, data: { passwordHash, authVersion: { increment: 1 } } }),
    prisma.refreshToken.updateMany({ where: { userId: id, revokedAt: null }, data: { revokedAt: new Date() } }),
  ]);
}

export async function listUsers({ page, pageSize, search, role, status, sortBy = "createdAt", sortOrder = "desc" }) {
  const where = {
    ...(role && { role }),
    ...(status && { status }),
    ...(search && {
      OR: [
        { name: { contains: search, mode: "insensitive" } },
        { email: { contains: search, mode: "insensitive" } },
      ],
    }),
  };

  const [items, total] = await Promise.all([
    prisma.user.findMany({
      where,
      select: publicSelect,
      orderBy: { [sortBy]: sortOrder },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.user.count({ where }),
  ]);

  const sales = await prisma.order.groupBy({ by: ["customerId"], where: { customerId: { in: items.map((item) => item.id) }, status: { not: "CANCELLED" } }, _sum: { totalAmount: true }, _count: true });
  const totals = new Map(sales.map((sale) => [sale.customerId, sale]));
  return {
    items: items.map((item) => ({ ...item, orders: totals.get(item.id)?._count || 0, spent: Number(totals.get(item.id)?._sum.totalAmount || 0) })),
    pagination: {
      page,
      pageSize,
      total,
      totalPages: Math.ceil(total / pageSize),
    },
  };
}

export async function createUser(data) {
  const existing = await prisma.user.findUnique({ where: { email: data.email.toLowerCase() } });
  if (existing) throw new ConflictError("این ایمیل قبلاً ثبت شده است");
  const passwordHash = await hashPassword(data.password);
  return prisma.user.create({
    data: { name: data.name, email: data.email.toLowerCase(), passwordHash, role: data.role, status: data.status },
    select: publicSelect,
  });
}

export async function getUserById(id) {
  const user = await prisma.user.findUnique({ where: { id }, select: publicSelect });
  if (!user) throw new NotFoundError("کاربر یافت نشد");
  return user;
}

export async function updateUser(id, data, actingUser) {
  if (actingUser.role === "MANAGER") {
    const target = await prisma.user.findUnique({ where: { id } });
    if (target?.role === "ADMIN" || (data.role && data.role !== target?.role)) throw new ForbiddenError("تغییر حساب مدیر کل یا نقش کاربران فقط برای مدیر کل مجاز است");
  }
  // یک کاربر (حتی ادمین) نمی‌تواند نقش یا وضعیت خودش را تغییر دهد —
  // از قفل‌شدن تصادفی خارج از حساب ادمین یا سوءاستفاده جلوگیری می‌کند.
  if (id === actingUser.id && (data.role || data.status)) {
    throw new ForbiddenError("امکان تغییر نقش یا وضعیت حساب خودتان وجود ندارد");
  }

  const user = await prisma.user
    .update({ where: { id }, data, select: publicSelect })
    .catch(() => null);

  if (!user) throw new NotFoundError("کاربر یافت نشد");
  return user;
}

export async function deleteUser(id, actingUser) {
  if (id === actingUser.id) {
    throw new ForbiddenError("امکان حذف حساب خودتان وجود ندارد");
  }

  const deleted = await prisma.user.delete({ where: { id } }).catch(() => null);
  if (!deleted) throw new NotFoundError("کاربر یافت نشد");
}
