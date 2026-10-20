import { prisma } from "../config/prisma.js";
import { NotFoundError, BadRequestError } from "../utils/AppError.js";

/** ترتیب نمایش سایز/واریانت‌ها در پنل و در منوی سایت. */
const VARIANT_ORDER_BY = [{ sortOrder: "asc" }, { price: "asc" }];
const VARIANT_SELECT = { id: true, label: true, labelEn: true, price: true, sortOrder: true, isActive: true };

/** حداکثر مخلفات پیشنهادی برای یک غذا؛ سقف سبد سایت ۳۰ قلم است. */
const MAX_ADD_ONS = 12;

/** ترتیب نمایش مخلفات؛ در پنل و در پیشنهاد سایت یکسان است. */
const ADD_ON_ORDER_BY = [{ sortOrder: "asc" }, { createdAt: "asc" }];

/**
 * مخلفات هر محصول با همان الگوی واریانت‌ها خوانده می‌شوند تا فرم پنل بتواند
 * انتخاب‌های فعلی را پیش‌پر کند. توجه: `Product.addOns` ردیف‌های جدول واسط است،
 * پس محصول مخلفات از رابطه تودرتو خوانده و در `toAdminProduct` صاف می‌شود.
 */
const ADD_ON_INCLUDE = {
  addOns: {
    orderBy: ADD_ON_ORDER_BY,
    select: {
      id: true,
      sortOrder: true,
      isActive: true,
      addOn: { select: { id: true, name: true, price: true, stock: true, isActive: true } },
    },
  },
};

/** ردیف جدول واسط → کارت محصول برای فرم پنل (`addOnIds` از `id` ساخته می‌شود). */
function toAddOnView(link) {
  return {
    id: link.addOn.id,
    name: link.addOn.name,
    price: link.addOn.price,
    stock: link.addOn.stock,
    isActive: link.addOn.isActive,
    sortOrder: link.sortOrder,
  };
}

/** پاسخ محصول برای پنل: مخلفات به شکل کارت محصول، نه رکورد جدول واسط. */
function toAdminProduct(product) {
  if (!product) return product;
  const { addOns = [], ...rest } = product;
  return { ...rest, addOns: addOns.map(toAddOnView) };
}

/** بدنه ورودی پنل → شکل قابل نوشتن در دیتابیس. */
function normalizeVariant(input, index) {
  return {
    label: String(input.label ?? "").trim(),
    labelEn: String(input.labelEn ?? "").trim() || null,
    price: input.price,
    sortOrder: Number.isInteger(input.sortOrder) ? input.sortOrder : index,
    isActive: input.isActive !== false,
  };
}

/**
 * بدنه ورودی را به فیلدهای خود محصول، آرایه واریانت‌ها و فهرست مخلفات تقسیم
 * می‌کند.
 *
 * `variants`/`addOnIds` نبودن در بدنه (`null`) یعنی «دست نزن»؛ آرایه خالی یعنی
 * «همه را حذف کن». همین قرارداد باعث می‌شود `PATCH` جزئی (مثل تغییر موجودی)
 * پیکربندی مخلفات را پاک نکند.
 */
function splitPayload(data) {
  const { variants, addOnIds, ...product } = data;
  return {
    product,
    variants: Array.isArray(variants) ? variants.map(normalizeVariant) : null,
    addOnIds: Array.isArray(addOnIds) ? [...new Set(addOnIds.map((id) => String(id)))] : null,
  };
}

/**
 * اعتبارسنجی فهرست مخلفات پیش از نوشتن.
 *
 * فقط شناسه‌های موجود و فعال پذیرفته می‌شوند و محصول نمی‌تواند مخلفات خودش باشد
 * (وگرنه همان غذا دوبار — یک‌بار اصلی و یک‌بار مخلفات — در یک سفارش می‌نشست).
 */
async function assertAddOnsUsable(productId, addOnIds) {
  if (!addOnIds || addOnIds.length === 0) return;
  if (addOnIds.length > MAX_ADD_ONS) {
    throw new BadRequestError(`حداکثر ${MAX_ADD_ONS} مخلفات برای هر محصول قابل تعریف است.`);
  }
  if (productId && addOnIds.includes(productId)) {
    throw new BadRequestError("یک محصول نمی‌تواند مخلفات خودش باشد.");
  }

  const found = await prisma.product.findMany({
    where: { id: { in: addOnIds }, isActive: true },
    select: { id: true },
  });
  if (found.length !== addOnIds.length) {
    throw new BadRequestError("یکی از مخلفات انتخاب‌شده وجود ندارد یا غیرفعال است.");
  }
}

/** فهرست مخلفات را با پیکربندی جدید جایگزین می‌کند (فقط داخل تراکنش). */
async function replaceAddOns(tx, productId, addOnIds) {
  if (addOnIds === null) return;
  await tx.productAddOn.deleteMany({ where: { productId } });
  if (addOnIds.length === 0) return;
  await tx.productAddOn.createMany({
    data: addOnIds.map((addOnId, index) => ({ productId, addOnId, sortOrder: index })),
  });
}

export async function listProducts({ page, pageSize, search, category, sortBy = "createdAt", sortOrder = "desc" }) {
  const where = {
    ...(category && { category }),
    ...(search && { name: { contains: search, mode: "insensitive" } }),
  };

  const [items, total] = await Promise.all([
    prisma.product.findMany({
      where,
      orderBy: { [sortBy]: sortOrder },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: { variants: { orderBy: VARIANT_ORDER_BY, select: VARIANT_SELECT }, ...ADD_ON_INCLUDE },
    }),
    prisma.product.count({ where }),
  ]);

  const sales = await prisma.orderItem.groupBy({ by: ["productId"], where: { productId: { in: items.map((item) => item.id) }, order: { status: { not: "CANCELLED" } } }, _sum: { quantity: true } });
  const sold = new Map(sales.map((sale) => [sale.productId, sale._sum.quantity]));
  return {
    items: items.map((item) => toAdminProduct({ ...item, sold: sold.get(item.id) || 0 })),
    pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
  };
}

export async function getProductById(id) {
  const product = await prisma.product.findUnique({
    where: { id },
    include: { variants: { orderBy: VARIANT_ORDER_BY, select: VARIANT_SELECT }, ...ADD_ON_INCLUDE },
  });
  if (!product) throw new NotFoundError("محصول یافت نشد");
  return toAdminProduct(product);
}

export async function createProduct(data) {
  const { product, variants, addOnIds } = splitPayload(data);
  await assertAddOnsUsable(null, addOnIds);

  return prisma.$transaction(async (tx) => {
    const created = await tx.product.create({
      data: {
        ...product,
        ...(variants && variants.length > 0 ? { variants: { create: variants } } : null),
      },
    });

    await replaceAddOns(tx, created.id, addOnIds);

    return toAdminProduct(await tx.product.findUnique({
      where: { id: created.id },
      include: { variants: { orderBy: VARIANT_ORDER_BY, select: VARIANT_SELECT }, ...ADD_ON_INCLUDE },
    }));
  });
}

export async function updateProduct(id, data) {
  const { product, variants, addOnIds } = splitPayload(data);

  const existing = await prisma.product.findUnique({ where: { id }, select: { id: true } });
  if (!existing) throw new NotFoundError("محصول یافت نشد");

  await assertAddOnsUsable(id, addOnIds);

  return prisma.$transaction(async (tx) => {
    await tx.product.update({ where: { id }, data: product });

    if (variants) {
      // واریانت‌های حذف‌شده پاک و بقیه به‌روزرسانی می‌شوند. آیتم‌های سفارش قدیمی
      // با `onDelete: SetNull` و `variantLabel` ذخیره‌شده سالم می‌مانند.
      await tx.productVariant.deleteMany({
        where: { productId: id, label: { notIn: variants.map((variant) => variant.label) } },
      });
      for (const variant of variants) {
        await tx.productVariant.upsert({
          where: { productId_label: { productId: id, label: variant.label } },
          create: { productId: id, ...variant },
          update: variant,
        });
      }
    }

    await replaceAddOns(tx, id, addOnIds);

    return toAdminProduct(await tx.product.findUnique({
      where: { id },
      include: { variants: { orderBy: VARIANT_ORDER_BY, select: VARIANT_SELECT }, ...ADD_ON_INCLUDE },
    }));
  });
}

export async function deleteProduct(id) {
  const deleted = await prisma.product.delete({ where: { id } }).catch(() => null);
  if (!deleted) throw new NotFoundError("محصول یافت نشد");
}
