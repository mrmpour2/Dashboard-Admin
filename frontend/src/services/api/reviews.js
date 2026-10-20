import api from "../axios";

/**
 * مسیرهای مدیریت نظرهای مشتریان (پنل ادمین).
 *
 * همان منبعی که بخش «Table Talk» صفحهٔ اصلی و «نظر مهمان‌ها» در صفحهٔ محصول
 * وب‌سایت از آن می‌خوانند؛ اینجا با توکن ادمین، همهٔ وضعیت‌ها (در انتظار،
 * تأییدشده، ردشده) قابل مشاهده و ویرایش است.
 *
 *   GET    /api/reviews?page&pageSize&search&status&featured
 *   PATCH  /api/reviews/:id   { status, featured, featuredOrder, replyBody, … }
 *   DELETE /api/reviews/:id
 */

export async function fetchReviews(params = {}) {
  const { data } = await api.get("/reviews", { params });
  return data; // { items, pagination }
}

export async function updateReview(id, payload) {
  const { data } = await api.patch(`/reviews/${id}`, payload);
  return data.review;
}

export async function deleteReview(id) {
  await api.delete(`/reviews/${id}`);
}
