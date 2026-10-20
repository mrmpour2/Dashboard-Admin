import { asyncHandler } from "../utils/asyncHandler.js";
import * as reviewService from "../services/reviewService.js";

/**
 * کنترلر نظرهای مشتریان.
 *
 * مسیرهای عمومی (وب‌سایت مهمان) و مسیرهای پنل مدیریت هر دو به همین کنترلر
 * می‌رسند؛ تفاوت‌شان فقط در میان‌افزار احراز هویت روی روتر پنل است.
 */

/** فهرست نظرهای تأییدشدهٔ یک محصول + خلاصهٔ امتیاز. */
export const listPublicReviews = asyncHandler(async (req, res) => {
  res.json(
    await reviewService.listPublicReviews({
      ...req.query,
      withImages: req.query.withImages === true,
    }),
  );
});

/** ثبت نظر جدید (همیشه با وضعیت «در انتظار تأیید»). */
export const createPublicReview = asyncHandler(async (req, res) => {
  res.status(201).json(
    await reviewService.createPublicReview({
      ...req.body,
      memberId: req.clubMember?.id ?? null,
      memberPhone: req.clubMember?.phone ?? null,
    }),
  );
});

/** نظرهای انتخاب‌شده برای بخش «Table Talk» صفحهٔ اصلی. */
export const listTableTalk = asyncHandler(async (req, res) => {
  res.json(await reviewService.listTableTalk({ limit: req.query.limit }));
});

/** فهرست کامل نظرها برای پنل مدیریت. */
export const listReviews = asyncHandler(async (req, res) => {
  res.json(await reviewService.listReviews(req.query));
});

/** ویرایش نظر: تأیید/رد، انتخاب برای Table Talk، متن انگلیسی و پاسخ رستوران. */
export const updateReview = asyncHandler(async (req, res) => {
  res.json({ review: await reviewService.updateReview(req.params.id, req.body) });
});

/** حذف نظر. */
export const deleteReview = asyncHandler(async (req, res) => {
  await reviewService.deleteReview(req.params.id);
  res.status(204).end();
});
