import { prisma } from "../config/prisma.js";
import { NotFoundError } from "../utils/AppError.js";

/**
 * فهرست عمومی منو برای وب‌سایت (بدون احراز هویت).
 *
 * ستون `category` در دیتابیس یک رشته آزاد است (مثل «برگر» یا «پیتزا مثلثی»)،
 * بنابراین اینجا به دسته‌بندی‌های استاندارد وب‌سایت نگاشت می‌شود تا سمت کلاینت
 * لازم نباشد حدس بزند. هر آیتم یک `slug` پایدار هم می‌گیرد تا آدرس
 * `/menu/:slug` روی وب‌سایت قابل ساخت باشد.
 */

/** ترتیب قواعد مهم است؛ اولین تطبیق برنده است. */
const CATEGORY_RULES = [
  { category: "burgers", pattern: /(burger|برگر)/iu },
  { category: "pizza", pattern: /(pizza|پیتزا)/iu },
  { category: "drinks", pattern: /(drink|beverage|shake|smoothie|نوشیدنی|نوشید|شیک|کوکتل|آبمیوه|دمنوش)/iu },
  { category: "sides", pattern: /(side|fries|starter|appetizer|salad|سیب.?زمینی|ساید|پیش.?غذا|سالاد|قارچ)/iu },
  { category: "combos", pattern: /(combo|box|meal|bundle|کمبو|باکس|پکیج|بسته|پک)/iu },
];

/** ترتیب نمایش دسته‌ها در پاسخ API و در تب‌های وب‌سایت. */
const CATEGORY_ORDER = ["burgers", "pizza", "sides", "drinks", "combos"];

/** فقط فیلدهای عمومی محصول انتخاب می‌شود؛ قیمت خرید و داده داخلی بیرون نمی‌رود. */
const PRODUCT_FIELDS = {
  id: true,
  name: true,
  description: true,
  price: true,
  stock: true,
  category: true,
  imageUrl: true,
  // واریانت‌ها (سایز/بسته) با ترتیب نمایش پنل؛ غیرفعال‌ها نمایش داده نمی‌شوند.
  variants: {
    where: { isActive: true },
    orderBy: [{ sortOrder: "asc" }, { price: "asc" }],
    select: { id: true, label: true, labelEn: true, price: true },
  },
  // مخلفات فعال این غذا؛ فقط شناسه لازم است تا سایت بداند «آیا پیشنهادی دارد؟»
  // فهرست کامل با `GET /api/public/menu/:id/addons` و فقط هنگام باز شدن پنل می‌آید.
  addOns: {
    where: { isActive: true, addOn: { isActive: true } },
    select: { addOnId: true },
  },
};

const PRODUCT_ORDER_BY = [{ category: "asc" }, { name: "asc" }];
const MAX_SLUG_LENGTH = 80;

/** «رویال برگر» → «رویال-برگر»؛ حروف فارسی/عربی حفظ می‌شوند. */
export function slugifyMenuName(name) {
  const slug = String(name ?? "")
    .normalize("NFKC")
    .replace(/[\u200c\u200e\u200f]/g, " ") // نیم‌فاصله و نشانه‌های جهت
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, MAX_SLUG_LENGTH)
    .replace(/-+$/g, "");

  return slug || "menu-item";
}

/** دسته‌بندی آزاد دیتابیس → دسته استاندارد وب‌سایت (یا null اگر ناشناخته باشد). */
export function resolveMenuCategory(rawCategory, name = "") {
  const haystack = `${rawCategory ?? ""} ${name}`.trim();
  if (!haystack) return null;
  return CATEGORY_RULES.find(({ pattern }) => pattern.test(haystack))?.category ?? null;
}

function categoryRank(category) {
  const index = CATEGORY_ORDER.indexOf(category);
  return index === -1 ? CATEGORY_ORDER.length : index;
}

function toPublicMenuItem(product, slug) {
  const variants = Array.isArray(product.variants) ? product.variants : [];
  const available = product.stock > 0;
  const variantPrices = variants.map((variant) => Number(variant.price));
  // تعداد مخلفات فعال؛ سایت با همین عدد تصمیم می‌گیرد پنل پیشنهاد را باز کند
  // یا نه (وگرنه برای هر افزودن یک درخواست بی‌فایده می‌رفت).
  const addOnCount = Array.isArray(product.addOns) ? product.addOns.length : 0;

  return {
    id: slug,
    slug,
    productId: product.id,
    name: product.name.trim(),
    description: (product.description ?? "").trim(),
    category: resolveMenuCategory(product.category, product.name),
    categoryLabel: (product.category ?? "").trim() || null,
    // آیتم دارای سایز، قیمت «از» (ارزان‌ترین واریانت) را به‌عنوان قیمت پایه می‌دهد
    // تا کارت منو با صفحه محصول یک عدد نشان دهند.
    price: variantPrices.length ? Math.min(...variantPrices) : Number(product.price),
    currency: "IRT",
    image: (product.imageUrl ?? "").trim() || null,
    stock: product.stock,
    available,
    addOnCount,
    // موجودی روی واریانت تکرار نمی‌شود؛ موجودی خود محصول ملاک است و اینجا هم
    // همان وضعیت به کلاینت اعلام می‌شود تا سایزها با محصول هم‌داستان باشند.
    variants: variants.map((variant) => ({
      id: variant.id,
      label: String(variant.label ?? "").trim(),
      labelEn: String(variant.labelEn ?? "").trim() || null,
      price: Number(variant.price),
      stock: null,
      available,
    })),
  };
}

/** نام‌های تکراری نباید slug یکسان بگیرند؛ دومی پسوند عددی می‌گیرد. */
function withUniqueSlugs(products) {
  const used = new Set();

  return products.map((product) => {
    const base = slugifyMenuName(product.name);
    let slug = base;
    let suffix = 2;

    while (used.has(slug)) {
      slug = `${base}-${suffix}`;
      suffix += 1;
    }

    used.add(slug);
    return toPublicMenuItem(product, slug);
  });
}

export async function listPublicMenu({ category } = {}) {
  const filter = typeof category === "string" ? category.trim() : "";
  const products = await prisma.product.findMany({
    where: { isActive: true, ...(filter ? { category: filter } : {}) },
    orderBy: PRODUCT_ORDER_BY,
    select: PRODUCT_FIELDS,
  });

  const items = withUniqueSlugs(products).sort(
    (first, second) =>
      categoryRank(first.category) - categoryRank(second.category) ||
      first.name.localeCompare(second.name, "fa"),
  );

  return { items, total: items.length, currency: "IRT" };
}

export async function findPublicMenuItem(identifier) {
  const value = String(identifier ?? "").trim();
  if (!value) throw new NotFoundError("آیتم منو یافت نشد");

  // ابتدا شناسه داخلی (cuid) و سپس slug ساخته‌شده از نام بررسی می‌شود.
  const byId = await prisma.product.findFirst({
    where: { id: value, isActive: true },
    select: PRODUCT_FIELDS,
  });
  if (byId) return withUniqueSlugs([byId])[0];

  // slug از نام ساخته می‌شود، پس برای یافتن آن باید فهرست فعال پیمایش شود
  // (منوی رستوران کوچک است و نتیجه در سمت کلاینت کش می‌شود).
  const products = await prisma.product.findMany({
    where: { isActive: true },
    orderBy: PRODUCT_ORDER_BY,
    select: PRODUCT_FIELDS,
  });
  const match = withUniqueSlugs(products).find((item) => item.slug === value);
  if (!match) throw new NotFoundError("آیتم منو یافت نشد");

  return match;
}

/**
 * مخلفات پیشنهادی یک غذا برای پنل «تکمیل سفارش» سایت.
 *
 * فهرست کامل فقط زمانی خوانده می‌شود که مشتری غذا را به سبد گذاشته باشد؛ فهرست
 * منو فقط `addOnCount` را حمل می‌کند تا حجم پاسخ اصلی کم بماند.
 *
 * هر مخلفات یک آیتم عمومی کامل است (قیمت، موجودی، تصویر) تا پنل بتواند بدون
 * درخواست دوم کارت بسازد و همان اعتبارسنجی سبد را اجرا کند. آیتم بدون مخلفات
 * آرایه خالی می‌گیرد (نه خطا) و فقط شناسه ناشناخته ۴۰۴ می‌شود.
 */
export async function listPublicMenuAddOns(identifier) {
  const item = await findPublicMenuItem(identifier);

  const links = await prisma.productAddOn.findMany({
    where: { productId: item.productId, isActive: true, addOn: { isActive: true } },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    select: { addOn: { select: PRODUCT_FIELDS } },
  });

  const addOns = withUniqueSlugs(links.map((link) => link.addOn));
  return { addOns, total: addOns.length, currency: "IRT" };
}
