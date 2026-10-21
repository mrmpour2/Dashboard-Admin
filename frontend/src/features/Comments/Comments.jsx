import { useMemo, useState } from "react";
import { BadgeCheck, Check, MessageSquare, Star, X } from "lucide-react";
import { Badge, Card, Modal, Table } from "../../components/ui";
import DeleteConfirmButton from "../../components/DeleteConfirmButton";
import useModal from "../../components/ui/Modal/context/useModal";
import useToast from "../../components/ui/Toast/ToastContext/useToast";
import {
  useDeleteReviewMutation,
  useReviews,
  useUpdateReviewMutation,
} from "../../hooks/api/useReviews";

/**
 * مدیریت نظرهای مشتریان.
 *
 * این صفحه همان منبعی را نشان می‌دهد که وب‌سایت از آن می‌خواند: نظرهای ثبت‌شده
 * روی صفحهٔ محصول (جدول `reviews` در دیتابیس). هر ردیف سه کار دارد:
 *
 *   1. تأیید/رد نظر — فقط نظر تأییدشده به مسیرهای عمومی سایت می‌رود.
 *   2. «نمایش در Table Talk صفحهٔ اصلی» — انتخاب روایت‌ها برای صفحهٔ اصلی.
 *   3. پاسخ رستوران و حذف.
 *
 * همهٔ تغییرات از طریق `PATCH /api/reviews/:id` ذخیره می‌شوند؛ هیچ تغییری فقط
 * در مرورگر نگه‌داری نمی‌شود.
 */

const STATUS_META = {
  PENDING: { label: "در انتظار بررسی", variant: "warning" },
  APPROVED: { label: "تأییدشده", variant: "success" },
  REJECTED: { label: "ردشده", variant: "danger" },
};

const STATUS_FILTERS = [
  { value: "", label: "همه" },
  { value: "PENDING", label: "در انتظار بررسی" },
  { value: "APPROVED", label: "تأییدشده" },
  { value: "REJECTED", label: "ردشده" },
];

/** کلیدهای جستجوی جدول؛ روی شکل نرمال‌شدهٔ نظر (`normalizeReview`) کار می‌کنند. */
const FILTER_KEYS = ["author", "phone", "product", "text", "status", "orderNumber"];

/**
 * کلید «نمایش در Table Talk صفحهٔ اصلی».
 *
 * سوئیچ همیشه قابل استفاده است: اگر نظر هنوز تأیید نشده باشد، روشن‌کردن آن
 * همان لحظه تأیید را هم انجام می‌دهد (سرور هر دو فیلد را در یک `PATCH` می‌پذیرد)
 * تا مدیر برای یک کار دو مرحله‌ای مجبور به رفت‌وبرگشت نباشد. متن زیر سوئیچ دقیقاً
 * همان چیزی است که با کلیک اتفاق می‌افتد.
 */
function TableTalkSwitch({ review, onToggle, pending }) {
  const needsApproval = review.statusKey !== "APPROVED";

  return (
    <div className="flex flex-col items-start gap-1">
      <button
        type="button"
        role="switch"
        aria-checked={review.featured}
        aria-label={`نمایش نظر ${review.author} در Table Talk صفحه اصلی`}
        disabled={pending}
        onClick={() => onToggle(!review.featured)}
        className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${
          review.featured ? "bg-primary" : "bg-Border"
        } ${pending ? "cursor-not-allowed opacity-50" : "cursor-pointer"}`}
      >
        <span
          className={`absolute top-0.5 size-5 rounded-full bg-white shadow transition-all ${
            review.featured ? "start-5.5" : "start-0.5"
          }`}
        />
      </button>
      <span className="text-[11px] leading-5 text-textMuted">
        {review.featured
          ? "روی صفحه اصلی هست"
          : needsApproval
            ? "با روشن‌کردن، نظر تأیید و روی صفحه اصلی منتشر می‌شود"
            : "روی صفحه اصلی نیست"}
      </span>
    </div>
  );
}

/** فرم پاسخ رستوران به یک نظر (ذخیره در `replyBody`). */
function ReplyForm({ review, onDone }) {
  const { setOpen } = useModal();
  const { toast } = useToast();
  const updateReview = useUpdateReviewMutation();
  const [body, setBody] = useState(review.replyBody ?? "");

  const handleSubmit = async (event) => {
    event.preventDefault();
    try {
      await updateReview.mutateAsync({ id: review.id, payload: { replyBody: body.trim() } });
      toast.Success(body.trim() ? "پاسخ ثبت شد" : "پاسخ حذف شد");
      setOpen(false);
      onDone?.();
    } catch (error) {
      toast.Error(error?.message || "ثبت پاسخ با خطا مواجه شد");
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <Modal.Content.Body className="w-full items-stretch gap-4">
        <p className="text-sm text-textSecondary">
          این پاسخ زیر همین نظر در صفحهٔ محصول وب‌سایت نمایش داده می‌شود.
        </p>
        <label className="flex flex-col gap-2 text-start text-sm font-medium text-textSecondary">
          متن پاسخ
          <textarea
            value={body}
            onChange={(event) => setBody(event.target.value)}
            rows={4}
            maxLength={1000}
            className="w-full rounded-Input border border-Border bg-Surface p-3 text-sm text-textPrimary outline-none focus:border-primary"
          />
        </label>
      </Modal.Content.Body>
      <Modal.Content.Footer className="justify-end gap-2 px-4 pb-4">
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="rounded-Button px-3 py-2 text-sm text-textSecondary hover:bg-SurfaceMuted"
        >
          انصراف
        </button>
        <button
          type="submit"
          disabled={updateReview.isPending}
          className="rounded-Button bg-primary px-4 py-2 text-sm font-bold text-white disabled:opacity-50"
        >
          {updateReview.isPending ? "در حال ذخیره..." : "ذخیره پاسخ"}
        </button>
      </Modal.Content.Footer>
    </form>
  );
}

function ReplyModal({ review, onDone }) {
  return (
    <Modal>
      <Modal.Trigger
        aria-label={`پاسخ به نظر ${review.author}`}
        className="flex size-8 items-center justify-center rounded-lg text-textSecondary transition-colors hover:bg-SurfaceMuted hover:text-primary"
      >
        <MessageSquare size={16} />
      </Modal.Trigger>
      <Modal.Content>
        <Modal.Content.Header>پاسخ رستوران</Modal.Content.Header>
        <ReplyForm review={review} onDone={onDone} />
      </Modal.Content>
    </Modal>
  );
}

function Comments() {
  const [filter, setFilter] = useState("");
  const [status, setStatus] = useState("");
  const { toast } = useToast();

  const { data, isLoading, isError, error, refetch } = useReviews({
    page: 1,
    pageSize: 100,
    ...(status ? { status } : null),
  });

  const updateReview = useUpdateReviewMutation();
  const deleteReview = useDeleteReviewMutation();

  const reviews = data?.items ?? [];
  const filterKeys = useMemo(() => FILTER_KEYS, []);

  const pendingCount = reviews.filter((review) => review.statusKey === "PENDING").length;
  const featuredCount = reviews.filter((review) => review.featured).length;
  const ratedReviews = reviews.filter((review) => review.rating !== null);
  const averageRating = ratedReviews.length
    ? ratedReviews.reduce((sum, review) => sum + review.rating, 0) / ratedReviews.length
    : 0;

  const changeStatus = async (review, nextStatus) => {
    try {
      await updateReview.mutateAsync({ id: review.id, payload: { status: nextStatus } });
      toast.Success(
        nextStatus === "APPROVED" ? "نظر تأیید شد" : "نظر رد شد",
      );
    } catch (mutationError) {
      toast.Error(mutationError?.message || "به‌روزرسانی وضعیت با خطا مواجه شد");
    }
  };

  const toggleFeatured = async (review, featured) => {
    // روشن‌کردن سوئیچ برای نظر تأییدنشده، همان تأیید را هم انجام می‌دهد تا مدیر
    // برای یک کار دو مرحله‌ای نکند؛ سرور هر دو فیلد را در یک درخواست می‌پذیرد.
    const approveToo = featured && review.statusKey !== "APPROVED";
    const payload = approveToo ? { featured: true, status: "APPROVED" } : { featured };

    try {
      await updateReview.mutateAsync({ id: review.id, payload });
      toast.Success(
        approveToo
          ? "نظر تأیید و به Table Talk صفحه اصلی اضافه شد"
          : featured
            ? "این نظر به Table Talk صفحه اصلی اضافه شد"
            : "این نظر از Table Talk حذف شد",
      );
    } catch (mutationError) {
      toast.Error(mutationError?.message || "تغییر وضعیت Table Talk با خطا مواجه شد");
    }
  };

  const removeReview = async (review) => {
    try {
      await deleteReview.mutateAsync(review.id);
      toast.Success("نظر حذف شد");
    } catch (mutationError) {
      toast.Error(mutationError?.message || "حذف نظر با خطا مواجه شد");
    }
  };

  if (isLoading) {
    return (
      <div className="rounded-xl border border-Border p-8 text-center text-textSecondary">
        در حال دریافت نظرات...
      </div>
    );
  }

  if (isError) {
    return (
      <div
        role="alert"
        className="rounded-xl border border-Border p-8 text-center text-textSecondary"
      >
        <p>{error?.message ?? "دریافت نظرات ناموفق بود."}</p>

        <button
          type="button"
          className="mt-3 text-primary hover:underline"
          onClick={() => refetch()}
        >
          تلاش مجدد
        </button>
      </div>
    );
  }

  return (
    <section className="space-y-5" aria-labelledby="comments-title">
      <div>
        <h1 id="comments-title" className="text-2xl font-bold text-textPrimary">
          نظرهای مشتریان
        </h1>

        <p className="mt-1 text-sm text-textSecondary">
          تأیید نظرهای ثبت‌شده در سایت و انتخاب آن‌ها برای بخش «Table Talk» صفحهٔ اصلی
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="p-4 text-right">
          <p className="text-xs text-textMuted">کل نظرها (این فهرست)</p>

          <p className="mt-2 text-2xl font-bold">
            {reviews.length.toLocaleString("fa-IR")}
          </p>
        </Card>

        <Card className="p-4 text-right">
          <p className="text-xs text-textMuted">در انتظار بررسی</p>

          <p className="mt-2 text-2xl font-bold">
            {pendingCount.toLocaleString("fa-IR")}
          </p>
        </Card>

        <Card className="p-4 text-right">
          <p className="text-xs text-textMuted">میانگین امتیاز</p>

          <p className="mt-2 inline-flex items-center gap-1 text-2xl font-bold">
            {ratedReviews.length ? averageRating.toFixed(1) : "—"}
            <Star className="size-5 fill-current" />
          </p>
        </Card>

        <Card className="p-4 text-right">
          <p className="text-xs text-textMuted">در Table Talk صفحه اصلی</p>

          <p className="mt-2 text-2xl font-bold">
            {featuredCount.toLocaleString("fa-IR")}
          </p>
        </Card>
      </div>

      <div className="flex flex-wrap gap-2">
        {STATUS_FILTERS.map((option) => (
          <button
            key={option.value || "all"}
            type="button"
            aria-pressed={status === option.value}
            onClick={() => setStatus(option.value)}
            className={`rounded-Button px-3 py-1.5 text-sm transition-colors ${
              status === option.value
                ? "bg-primary text-white"
                : "bg-SurfaceMuted text-textSecondary hover:bg-Border"
            }`}
          >
            {option.label}
          </button>
        ))}
      </div>


      <Card className="overflow-hidden text-right">
        <div className="flex items-center justify-between gap-4 border-b border-Border p-4">
          <div className="flex items-center gap-2">
            <MessageSquare className="size-5 text-primary" />

            <span className="font-bold text-textPrimary">فهرست نظرها</span>
          </div>

          <Table.Filter
            value={filter}
            onChange={setFilter}
            placeholder="جستجوی نام، شمارهٔ تماس، متن یا محصول..."
          />
        </div>

        <Table variant="striped" minWidth="min-w-[1200px]">
          <Table.Header>
            <Table.HeaderCell sortKey="author">مشتری</Table.HeaderCell>

            <Table.HeaderCell sortKey="phone">شمارهٔ تماس</Table.HeaderCell>

            <Table.HeaderCell sortKey="product">محصول</Table.HeaderCell>

            <Table.HeaderCell sortKey="rating">امتیاز</Table.HeaderCell>

            <Table.HeaderCell sortKey="status">وضعیت</Table.HeaderCell>

            <Table.HeaderCell sortKey="date">تاریخ ثبت</Table.HeaderCell>

            <Table.HeaderCell>متن نظر</Table.HeaderCell>

            <Table.HeaderCell>Table Talk</Table.HeaderCell>

            <Table.HeaderCell>عملیات</Table.HeaderCell>
          </Table.Header>

          <Table.Body filter={filter} filterKeys={filterKeys}>
            {reviews.map((review) => (
              <Table.Row key={review.id} rowId={review.id} data={review}>
                <Table.Cell>
                  <p className="font-medium text-textPrimary">{review.author}</p>

                  {review.orderVerified ? (
                    <span className="mt-1 inline-flex items-center gap-1 text-[11px] text-Success">
                      <BadgeCheck size={13} />
                      خرید تأییدشده
                    </span>
                  ) : null}

                  {review.orderNumber !== "—" ? (
                    <p dir="ltr" className="mt-1 text-[11px] text-textMuted">
                      {review.orderNumber}
                    </p>
                  ) : null}
                </Table.Cell>

                <Table.Cell className="whitespace-nowrap">
                  {review.phone === "—" ? (
                    <span className="text-textMuted">ثبت نشده</span>
                  ) : (
                    <span dir="ltr" className="font-mono text-xs text-textSecondary">
                      {review.phone}
                    </span>
                  )}
                </Table.Cell>

                <Table.Cell className="max-w-40 truncate">{review.product}</Table.Cell>

                <Table.Cell>
                  {review.rating ? (
                    <span className="inline-flex items-center gap-1">
                      {Number(review.rating).toLocaleString("fa-IR")}

                      <Star className="size-3.5 fill-current" />
                    </span>
                  ) : (
                    <span className="text-textMuted">بدون امتیاز</span>
                  )}
                </Table.Cell>

                <Table.Cell>
                  <Badge variant={STATUS_META[review.statusKey]?.variant ?? "brand"}>
                    {review.status}
                  </Badge>
                </Table.Cell>

                <Table.Cell className="whitespace-nowrap text-xs text-textMuted">
                  {review.date}
                </Table.Cell>

                <Table.Cell className="max-w-md leading-6">
                  {review.text ? (
                    <span className="text-textPrimary">{review.text}</span>
                  ) : (
                    <span className="text-textMuted">متنی ثبت نشده است</span>
                  )}

                  {review.images?.length ? (
                    <span className="mt-2 block text-[11px] text-textMuted">
                      {review.images.length.toLocaleString("fa-IR")} تصویر پیوست
                    </span>
                  ) : null}

                  {review.replyBody ? (
                    <span className="mt-2 block rounded-lg bg-SurfaceMuted p-2 text-xs leading-5 text-textSecondary">
                      پاسخ شما: {review.replyBody}
                    </span>
                  ) : null}
                </Table.Cell>

                <Table.Cell>
                  <TableTalkSwitch
                    review={review}
                    pending={updateReview.isPending}
                    onToggle={(featured) => toggleFeatured(review, featured)}
                  />
                </Table.Cell>

                <Table.Cell>
                  <div className="flex items-center gap-1">
                    {review.statusKey !== "APPROVED" ? (
                      <button
                        type="button"
                        aria-label={`تأیید نظر ${review.author}`}
                        onClick={() => changeStatus(review, "APPROVED")}
                        className="flex size-8 items-center justify-center rounded-lg text-Success transition-colors hover:bg-Success/10"
                      >
                        <Check size={16} />
                      </button>
                    ) : null}

                    {review.statusKey !== "REJECTED" ? (
                      <button
                        type="button"
                        aria-label={`رد نظر ${review.author}`}
                        onClick={() => changeStatus(review, "REJECTED")}
                        className="flex size-8 items-center justify-center rounded-lg text-textSecondary transition-colors hover:bg-SurfaceMuted"
                      >
                        <X size={16} />
                      </button>
                    ) : null}

                    <ReplyModal review={review} />

                    <DeleteConfirmButton
                      itemLabel={`نظر ${review.author}`}
                      isPending={deleteReview.isPending}
                      onConfirm={() => removeReview(review)}
                    />
                  </div>
                </Table.Cell>
              </Table.Row>
            ))}
          </Table.Body>
        </Table>

        {reviews.length === 0 ? (
          <p className="border-t border-Border p-6 text-center text-sm text-textSecondary">
            نظری با این فیلتر پیدا نشد. نظرهای تازهٔ سایت با وضعیت «در انتظار بررسی» همین‌جا
            ظاهر می‌شوند.
          </p>
        ) : null}
      </Card>
    </section>
  );
}

export default Comments;
