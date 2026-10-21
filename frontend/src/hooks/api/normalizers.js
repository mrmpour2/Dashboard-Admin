/** @param {Record<string, any>} product */
export function normalizeProduct(product) {
  const stock = Number(product.stock || 0);
  return { ...product, name: product.name ?? product.title, title: product.name ?? product.title, price: Number(product.price || 0), stock, sold: Number(product.sold || 0), rating: Number(product.rating || 0), status: stock === 0 ? "ناموجود" : stock <= 5 ? "کم‌موجود" : "موجود" };
}
/** @param {Record<string, any>} user */
export function normalizeUser(user) {
  return { ...user, phone: user.phone ?? "—", orders: Number(user.orders || 0), spent: Number(user.spent || 0), status: { ACTIVE: "فعال", INACTIVE: "غیرفعال", SUSPENDED: "مسدود" }[user.status] || user.status };
}
/** @param {Record<string, any>} ticket */
export function normalizeTicket(ticket) {
  return { ...ticket, subject: ticket.title ?? ticket.subject, customer: ticket.assignee?.name ?? ticket.customer ?? "تخصیص داده نشده", messages: ticket._count?.comments ?? ticket.comments?.length ?? 0, department: "پشتیبانی", priority: { HIGH: "بالا", MEDIUM: "متوسط", LOW: "پایین", URGENT: "فوری" }[ticket.priority] || ticket.priority, status: { OPEN: "باز", IN_PROGRESS: "در حال بررسی", RESOLVED: "حل‌شده", CLOSED: "بسته" }[ticket.status] || ticket.status, createdAt: ticket.createdAt ? new Date(ticket.createdAt).toLocaleDateString("fa-IR") : "—" };
}
/** برچسب فارسی وضعیت‌های نظر مشتری. */
const REVIEW_STATUS_LABELS = { PENDING: "در انتظار بررسی", APPROVED: "تأییدشده", REJECTED: "ردشده" };

/**
 * قالب تاریخ ثبت نظر.
 *
 * یک نمونهٔ مشترک ساخته می‌شود چون جدول می‌تواند ده‌ها ردیف داشته باشد و ساختن
 * `Intl.DateTimeFormat` برای هر ردیف بی‌دلیل گران است.
 */
const REVIEW_DATE_FORMAT = new Intl.DateTimeFormat("fa-IR", {
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
});

/** تاریخ ثبت (و ساعت) به تقویم و ارقام فارسی؛ ورودی نامعتبر `—` می‌شود. */
function toReviewDate(value) {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : REVIEW_DATE_FORMAT.format(date);
}

/**
 * @param {Record<string, any>} review نظر خام `GET /api/reviews`
 *
 * امتیاز اختیاری است: نظری که بدون امتیاز ثبت شده `rating: null` می‌گیرد تا
 * جدول «بدون امتیاز» نشان دهد و در محاسبهٔ میانگین شمرده نشود.
 *
 * فیلدهای نمایشی جدول اینجا ساخته می‌شوند (`author`، `text`، `product`، `phone`،
 * `date`) و `statusKey` مقدار خام enum را نگه می‌دارد تا منطق (مثل فعال‌بودن
 * سوئیچ Table Talk) به متن ترجمه‌شده گره نخورد.
 */
export function normalizeReview(review) {
  const rating = Number.isInteger(review.rating) ? review.rating : null;
  return { ...review, author: review.authorName || "مهمان", rating, product: review.productName ?? "—", text: review.body ?? "", statusKey: review.status, status: REVIEW_STATUS_LABELS[review.status] ?? review.status, featured: review.featured === true, orderVerified: review.orderVerified === true, replyBody: review.replyBody ?? "", orderNumber: review.orderNumber ?? "—", phone: review.authorPhone ?? "—", date: toReviewDate(review.createdAt) };
}

