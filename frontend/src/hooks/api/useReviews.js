import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { deleteReview, fetchReviews, updateReview } from "../../services/api/reviews";
import { normalizeReview } from "./normalizers";

/**
 * کوئری و میوتیشن‌های نظرهای مشتریان.
 *
 * هر تغییر (تأیید، رد، پرچم «نمایش در Table Talk»، پاسخ، حذف) کش فهرست را باطل
 * می‌کند تا جدول و آمار بلافاصله هم‌خوان شوند.
 *
 * خروجی سرور (نام، متن، محصول، شمارهٔ تماس، تاریخ ISO) خام است؛ اینجا با
 * `normalizeReview` به شکل نمایشی جدول تبدیل می‌شود — همان کاری که
 * `useProducts`/`useTickets` با نرمال‌سازهای خودشان می‌کنند. بدون این گام،
 * ستون‌های «متن نظر»، «تاریخ» و «شمارهٔ تماس» خالی می‌مانند.
 */

export const reviewsKeys = {
  all: ["reviews"],
  list: (params) => [...reviewsKeys.all, "list", params],
};

export function useReviews(params = {}) {
  return useQuery({
    queryKey: reviewsKeys.list(params),
    queryFn: async () => {
      const result = await fetchReviews(params);
      return { ...result, items: (result.items ?? []).map(normalizeReview) };
    },
    placeholderData: (previousData) => previousData,
  });
}

export function useUpdateReviewMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }) => updateReview(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: reviewsKeys.all });
      // آمار «کارهای در انتظار» در TopBar از همان کوئری داشبورد می‌آید؛ با تأیید
      // یا رد یک نظر باید بلافاصله به‌روز شود.
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });
}

export function useDeleteReviewMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id) => deleteReview(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: reviewsKeys.all });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });
}
