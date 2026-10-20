import { prisma } from "../config/prisma.js";
import { awardReviewPoints, POINTS_PER_REVIEW } from "./clubService.js";
import { BadRequestError, NotFoundError } from "../utils/AppError.js";

/**
 * سرویس نظرهای مشتریان.
 *
 * دو مصرف‌کننده دارد:
 *   1. صفحهٔ محصول وب‌سایت (`GET/POST /api/public/reviews`)
 *   2. بخش «Table Talk» صفحهٔ اصلی (`GET /api/public/testimonials`)
 *
 * قواعد ثابت این سرویس:
 *   - فقط نظرهای `APPROVED` به مسیرهای عمومی می‌روند.
 *   - `featured` («نمایش در Table Talk») فقط از پنل مدیریت تغییر می‌کند؛ هر نظر
 *     منتشرشده به‌طور خودکار در صفحهٔ اصلی نمایش داده نمی‌شود.
 *   - هیچ فیلدی از خروجی عمومی نباید `orderNumber` را لو بدهد؛ فقط پرچم
 *     `orderVerified` بیرون می‌رود.
 */

/** سقف نظرهای بخش Table Talk؛ صفحهٔ اصلی نباید همهٔ نظرها را بکشد. */
export const TABLE_TALK_LIMIT = 12;
const MAX_TABLE_TALK_LIMIT = 24;
/** سقف تصاویر هر نظر؛ هم‌سبک با محدودیت رابط وب‌سایت (`toReviewImages`). */
const MAX_REVIEW_IMAGES = 4;

/** ترتیب‌های پشتیبانی‌شدهٔ فهرست عمومی؛ کلید = مقدار پارامتر `sort`. */
const SORT_ORDER_BY = {
  newest: [{ createdAt: "desc" }],
  oldest: [{ createdAt: "asc" }],
  highest: [{ rating: "desc" }, { createdAt: "desc" }],
  lowest: [{ rating: "asc" }, { createdAt: "desc" }],
};

/** فیلدهایی که در پاسخ فهرست عمومی صفحهٔ محصول لازم است (نه بیشتر). */
const PUBLIC_FIELDS = {
  id: true,
  productId: true,
  authorName: true,
  rating: true,
  body: true,
  images: true,
  orderVerified: true,
  status: true,
  replyBody: true,
  replyAt: true,
  createdAt: true,
};

/** فیلدهای بخش Table Talk؛ متن انگلیسی اختیاری هم لازم است. */
const TABLE_TALK_FIELDS = {
  id: true,
  authorName: true,
  authorNameEn: true,
  body: true,
  bodyEn: true,
  rating: true,
  orderVerified: true,
  createdAt: true,
  product: { select: { name: true } },
};

/** فیلدهای پنل مدیریت (شامل دادهٔ داخلی مثل شمارهٔ سفارش و شمارهٔ تماس مشتری). */
const ADMIN_FIELDS = {
  id: true,
  productId: true,
  product: { select: { name: true } },
  authorName: true,
  authorNameEn: true,
  authorPhone: true,
  rating: true,
  body: true,
  bodyEn: true,
  orderNumber: true,
  orderVerified: true,
  status: true,
  featured: true,
  featuredOrder: true,
  images: true,
  replyBody: true,
  replyAt: true,
  createdAt: true,
  updatedAt: true,
};

function toIso(value) {
  return value instanceof Date ? value.toISOString() : null;
}

/** پاسخ رستوران به یک نظر؛ اگر متنی ثبت نشده باشد `null`. */
function toReply(review) {
  const body = typeof review.replyBody === "string" ? review.replyBody.trim() : "";
  if (!body) return null;
  return { body, createdAt: toIso(review.replyAt ?? review.createdAt) };
}

/**
 * تبدیل رکورد دیتابیس به شکل قرارداد عمومی صفحهٔ محصول.
 *
 * `status` همیشه `PUBLISHED` است چون فهرست عمومی فقط نظرهای تأییدشده را
 * برمی‌گرداند؛ رابط وب‌سایت هر وضعیت دیگری جز `PENDING` را «منتشرشده» می‌داند.
 */
function toPublicReview(review) {
  return {
    id: review.id,
    productId: review.productId,
    authorName: review.authorName,
    rating: review.rating ?? null,
    body: review.body,
    createdAt: toIso(review.createdAt),
    images: Array.isArray(review.images) ? review.images.slice(0, MAX_REVIEW_IMAGES) : [],
    orderVerified: review.orderVerified === true,
    status: "PUBLISHED",
    reply: toReply(review),
  };
}

/** یک نظر برای بخش Table Talk؛ متن انگلیسی اگر نبود همان فارسی می‌ماند. */
function toTableTalkTestimonial(review) {
  return {
    id: review.id,
    authorName: review.authorName,
    authorNameEn: review.authorNameEn ?? null,
    body: review.body,
    bodyEn: review.bodyEn ?? null,
    rating: review.rating ?? null,
    orderVerified: review.orderVerified === true,
    createdAt: toIso(review.createdAt),
    productName: review.product?.name ?? null,
  };
}

/** یک نظر برای جدول پنل مدیریت (شامل شمارهٔ سفارش، شمارهٔ تماس و پرچم Table Talk). */
function toAdminReview(review) {
  return {
    id: review.id,
    productId: review.productId,
    productName: review.product?.name ?? null,
    authorName: review.authorName,
    authorNameEn: review.authorNameEn ?? null,
    authorPhone: review.authorPhone ?? null,
    rating: review.rating ?? null,
    body: review.body,
    bodyEn: review.bodyEn ?? null,
    orderNumber: review.orderNumber ?? null,
    orderVerified: review.orderVerified === true,
    status: review.status,
    featured: review.featured === true,
    featuredOrder: review.featuredOrder,
    images: Array.isArray(review.images) ? review.images : [],
    replyBody: review.replyBody ?? null,
    replyAt: toIso(review.replyAt),
    createdAt: toIso(review.createdAt),
    updatedAt: toIso(review.updatedAt),
  };
}

/**
 * خلاصهٔ امتیازهای **کل** یک محصول (مستقل از فیلترهای فهرست).
 *
 * رابط وب‌سایت میانگین و نمودار را از همین شیء می‌خواند؛ اگر خلاصه فیلترشده
 * بود، با تغییر فیلتر ستاره‌ها جابه‌جا می‌شد.
 */
async function buildProductSummary(productId) {
  const rows = await prisma.review.groupBy({
    by: ["rating"],
    where: { productId, status: "APPROVED" },
    _count: { _all: true },
  });

  const distribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  let total = 0;
  let sum = 0;

  for (const row of rows) {
    const count = row._count?._all ?? 0;
    if (!count) continue;
    // نظر بدون امتیاز (rating = null) نباید در میانگین و نمودار شمرده شود.
    // توجه: `Number(null)` صفر است، پس اول باید خودِ `null` رد شود.
    if (row.rating === null || row.rating === undefined) continue;
    const numeric = Number(row.rating);
    if (!Number.isFinite(numeric)) continue;
    // امتیاز بیرون از بازهٔ ۱ تا ۵ هم نباید نمودار را خراب کند.
    const star = Math.min(5, Math.max(1, Math.trunc(numeric)));
    distribution[star] += count;
    total += count;
    sum += star * count;
  }

  return {
    average: total ? Math.round((sum / total) * 10) / 10 : 0,
    total,
    distribution,
  };
}

/** شمارهٔ سفارش را هم‌شکل دیتابیس می‌کند (`ORD-…` همیشه با حروف بزرگ ذخیره می‌شود). */
function normalizeOrderNumber(value) {
  if (typeof value !== "string") return null;
  const normalized = value.trim().toUpperCase();
  return normalized || null;
}

/**
 * شمارهٔ تماس مشتری را نرمال می‌کند: ارقام فارسی/عربی → لاتین، حذف فاصله و
 * جداکننده‌ها. بدون این کار، «۰۹۱۲ ۳۴۵ ۶۷۸۹» و «09123456789» دو مشتری متفاوت
 * به نظر می‌رسند و جستجوی مدیر نتیجه نمی‌دهد.
 *
 * خروجی `null` یعنی شماره‌ای ثبت نشده است (فیلد اختیاری).
 */
function normalizePhoneNumber(value) {
  if (typeof value !== "string") return null;
  const latin = value
    .replace(/[\u06F0-\u06F9]/g, (digit) => String(digit.charCodeAt(0) - 0x06f0))
    .replace(/[\u0660-\u0669]/g, (digit) => String(digit.charCodeAt(0) - 0x0660))
    .replace(/[\s()\-\u200c]/g, "")
    .trim();
  return latin || null;
}

/**
 * آیا این شمارهٔ سفارش واقعاً در سیستم ثبت شده است؟
 *
 * هم سفارش‌های پنل و هم سفارش‌های گفتگو/سایت بررسی می‌شوند. پرچم «خرید
 * تأییدشده» فقط از همین تطابق ست می‌شود، نه از ورودی کاربر.
 */
async function orderExists(orderNumber) {
  const [chatOrder, panelOrder] = await Promise.all([
    prisma.chatOrder.findUnique({ where: { orderNumber }, select: { id: true } }),
    prisma.order.findFirst({ where: { orderNumber }, select: { id: true } }),
  ]);
  return Boolean(chatOrder || panelOrder);
}

/**
 * فهرست عمومی نظرهای یک محصول.
 *
 * `summary` کل محصول است و `total` فقط نظرهای منطبق با فیلتر فعلی را می‌شمارد
 * (برای متن «N نظر» و صفحه‌بندی) — همان قرارداد مستندشده در
 * `website/docs/reviews.md`.
 */
export async function listPublicReviews({
  productId,
  page = 1,
  pageSize = 6,
  sort = "newest",
  rating,
  withImages = false,
} = {}) {
  const where = {
    productId,
    status: "APPROVED",
    ...(rating ? { rating } : {}),
    ...(withImages ? { images: { isEmpty: false } } : {}),
  };

  const [rows, total, summary] = await Promise.all([
    prisma.review.findMany({
      where,
      orderBy: SORT_ORDER_BY[sort] ?? SORT_ORDER_BY.newest,
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: PUBLIC_FIELDS,
    }),
    prisma.review.count({ where }),
    buildProductSummary(productId),
  ]);

  return {
    items: rows.map(toPublicReview),
    summary,
    total,
    page,
    hasMore: page * pageSize < total,
  };
}

/**
 * ثبت نظر جدید از سایت.
 *
 * نظر تازه همیشه `PENDING` است تا تیم آن را ببیند. اگر محصول وجود نداشته باشد
 * خطای ۴۰۰ برمی‌گردانیم و **نه** ۴۰۴: رابط وب‌سایت هر ۴۰۴ روی این مسیر را
 * «مسیر نظرات ساخته نشده» تفسیر می‌کند و بی‌صدا به دادهٔ آزمایشی می‌رود.
 */
export async function createPublicReview({
  productId,
  authorName,
  rating,
  body,
  orderNumber,
  authorPhone,
  memberId = null,
  memberPhone = null,
}) {
  const product = await prisma.product.findFirst({
    where: { id: productId, isActive: true },
    select: { id: true },
  });
  if (!product) {
    throw new BadRequestError("این آیتم در منو فعال نیست یا وجود ندارد.");
  }

  const normalizedOrder = normalizeOrderNumber(orderNumber);
  const orderVerified = normalizedOrder ? await orderExists(normalizedOrder) : false;

  const created = await prisma.review.create({
    data: {
      productId: product.id,
      authorName: authorName.trim(),
      // شمارهٔ تماس اختیاری است؛ فقط برای پیگیری در پنل مدیریت ذخیره می‌شود.
      // اگر عضو باشگاه وارد شده باشد، شمارهٔ تأییدشدهٔ حساب مقدم است.
      authorPhone: normalizePhoneNumber(memberPhone) ?? normalizePhoneNumber(authorPhone),
      clubMemberId: memberId,
      rating,
      body: body.trim(),
      orderNumber: normalizedOrder,
      orderVerified,
      status: "PENDING",
    },
    select: { id: true, status: true },
  });

  return {
    review: { id: created.id, status: created.status },
    // امتیاز پس از تأیید مدیر اضافه می‌شود؛ عدد فقط برای نمایش «در انتظار» است.
    pointsPending: Boolean(memberId),
    pointsPerReview: POINTS_PER_REVIEW,
  };
}

/** فهرست نظرها برای پنل مدیریت (همهٔ وضعیت‌ها، با جستجو و فیلتر). */
export async function listReviews({ page = 1, pageSize = 20, search, status, featured } = {}) {
  const searchTerm = typeof search === "string" ? search.trim() : "";
  // جستجوی شمارهٔ تماس: اگر مدیر شماره را با ارقام فارسی بنویسد، همان‌جا نرمال
  // می‌شود تا با شمارهٔ ذخیره‌شده (ارقام لاتین) مقایسه شود.
  const phoneTerm = normalizePhoneNumber(searchTerm);
  const phoneSearch = phoneTerm && /^\+?\d{3,}$/.test(phoneTerm) ? phoneTerm : "";
  const where = {
    ...(status ? { status } : {}),
    ...(featured === undefined ? {} : { featured }),
    ...(searchTerm
      ? {
          OR: [
            { authorName: { contains: searchTerm, mode: "insensitive" } },
            { body: { contains: searchTerm, mode: "insensitive" } },
            ...(phoneSearch ? [{ authorPhone: { contains: phoneSearch } }] : []),
          ],
        }
      : {}),
  };

  const [items, total] = await Promise.all([
    prisma.review.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: ADMIN_FIELDS,
    }),
    prisma.review.count({ where }),
  ]);

  return {
    items: items.map(toAdminReview),
    pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
  };
}

/**
 * ویرایش یک نظر از پنل مدیریت.
 *
 * همین مسیر دو کار اصلی را انجام می‌دهد: تأیید/رد نظر (`status`) و انتخاب برای
 * Table Talk (`featured` / `featuredOrder`). متن انگلیسی اختیاری هم از اینجا
 * قابل ثبت است تا سایت انگلیسی همان نظر را با ترجمه نشان دهد.
 */
export async function updateReview(id, patch = {}) {
  const existing = await prisma.review.findUnique({
    where: { id },
    select: { id: true, status: true, clubMemberId: true },
  });
  if (!existing) throw new NotFoundError("نظر یافت نشد.");

  const data = {};
  const assignString = (key, { max = 1000, allowEmpty = false } = {}) => {
    if (!(key in patch)) return;
    const value = typeof patch[key] === "string" ? patch[key].trim() : "";
    if (!value && !allowEmpty) return;
    data[key] = value ? value.slice(0, max) : null;
  };

  assignString("authorName", { max: 60 });
  assignString("authorNameEn", { max: 60, allowEmpty: true });
  // شمارهٔ تماس مشتری از پنل؛ نرمال می‌شود تا جستجو و نمایش یک‌شکل بماند.
  if ("authorPhone" in patch) {
    data.authorPhone = normalizePhoneNumber(patch.authorPhone);
  }
  assignString("body", { max: 1000 });
  assignString("bodyEn", { max: 1000, allowEmpty: true });

  if ("rating" in patch) data.rating = patch.rating;
  if ("status" in patch) data.status = patch.status;
  if ("featured" in patch) data.featured = patch.featured;
  if ("featuredOrder" in patch) data.featuredOrder = patch.featuredOrder;

  if ("replyBody" in patch) {
    const reply = typeof patch.replyBody === "string" ? patch.replyBody.trim() : "";
    data.replyBody = reply ? reply.slice(0, 1000) : null;
    data.replyAt = reply ? new Date() : null;
  }

  if (Object.keys(data).length === 0) {
    throw new BadRequestError("حداقل یک فیلد برای تغییر لازم است.");
  }

  const updated = await prisma.review.update({ where: { id }, data, select: ADMIN_FIELDS });

  // امتیاز نظر فقط در لحظهٔ اولین تأیید و فقط برای عضوی که نظر را ثبت کرده
  // اضافه می‌شود؛ تغییر دوبارهٔ وضعیت امتیاز تکراری نمی‌سازد.
  let pointsAwarded = 0;
  if (data.status === "APPROVED" && existing.status !== "APPROVED" && existing.clubMemberId) {
    try {
      const award = await awardReviewPoints(id, existing.clubMemberId);
      pointsAwarded = award.awarded || 0;
    } catch (error) {
      // تأیید نظر نباید به‌خاطر خطای موقت امتیاز شکست بخورد؛ لاگ برای پیگیری.
      console.error("club review points failed", error);
    }
  }

  return { ...toAdminReview(updated), pointsAwarded };
}

/** حذف کامل یک نظر (برای محتوای نامناسب یا درخواست خود کاربر). */
export async function deleteReview(id) {
  const existing = await prisma.review.findUnique({ where: { id }, select: { id: true } });
  if (!existing) throw new NotFoundError("نظر یافت نشد.");
  await prisma.review.delete({ where: { id } });
}

/**
 * نظرهایی که مدیر برای بخش «Table Talk» صفحهٔ اصلی انتخاب کرده است.
 *
 * ترتیب دستی (`featuredOrder`) اول اعمال می‌شود تا مدیر بتواند ترتیب روایت‌ها
 * را تعیین کند؛ نظرهای هم‌ترتیب تازه‌ترها را نشان می‌دهند.
 */
export async function listTableTalk({ limit } = {}) {
  const requested = Number(limit);
  const take = Math.min(
    MAX_TABLE_TALK_LIMIT,
    Math.max(
      1,
      Number.isFinite(requested) && requested > 0 ? Math.trunc(requested) : TABLE_TALK_LIMIT,
    ),
  );
  const where = { status: "APPROVED", featured: true };

  const [rows, total] = await Promise.all([
    prisma.review.findMany({
      where,
      orderBy: [{ featuredOrder: "asc" }, { createdAt: "desc" }],
      take,
      select: TABLE_TALK_FIELDS,
    }),
    prisma.review.count({ where }),
  ]);

  return { items: rows.map(toTableTalkTestimonial), total };
}
