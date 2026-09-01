import { prisma } from "../config/prisma.js";
import { NotFoundError, ForbiddenError } from "../utils/AppError.js";

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

export async function listUsers({ page, pageSize, search, role, status }) {
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
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.user.count({ where }),
  ]);

  return {
    items,
    pagination: {
      page,
      pageSize,
      total,
      totalPages: Math.ceil(total / pageSize),
    },
  };
}

export async function getUserById(id) {
  const user = await prisma.user.findUnique({ where: { id }, select: publicSelect });
  if (!user) throw new NotFoundError("کاربر یافت نشد");
  return user;
}

export async function updateUser(id, data, actingUser) {
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
