import { prisma } from "../config/prisma.js";
import { NotFoundError } from "../utils/AppError.js";

export async function listProducts({ page, pageSize, search, category }) {
  const where = {
    ...(category && { category }),
    ...(search && { name: { contains: search, mode: "insensitive" } }),
  };

  const [items, total] = await Promise.all([
    prisma.product.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.product.count({ where }),
  ]);

  return {
    items,
    pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
  };
}

export async function getProductById(id) {
  const product = await prisma.product.findUnique({ where: { id } });
  if (!product) throw new NotFoundError("محصول یافت نشد");
  return product;
}

export async function createProduct(data) {
  return prisma.product.create({ data });
}

export async function updateProduct(id, data) {
  const product = await prisma.product.update({ where: { id }, data }).catch(() => null);
  if (!product) throw new NotFoundError("محصول یافت نشد");
  return product;
}

export async function deleteProduct(id) {
  const deleted = await prisma.product.delete({ where: { id } }).catch(() => null);
  if (!deleted) throw new NotFoundError("محصول یافت نشد");
}
