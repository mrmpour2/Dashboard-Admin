import { AlertTriangle, RotateCcw } from "lucide-react";
import { Spinner, EmptyState, Button } from "../components/ui";

/**
 * یک wrapper مشترک برای مدیریت یکدست وضعیت‌های بارگذاری/خطا/خالی روی داده‌های React Query.
 * به این ترتیب هر صفحه (Users، Products، Tickets و...) این سه حالت را
 * از صفر بازنویسی نمی‌کند و رفتار یکسانی در کل داشبورد دارند.
 */
function QueryState({
  isLoading,
  isError,
  error,
  onRetry,
  isEmpty,
  emptyIcon,
  emptyTitle = "موردی یافت نشد",
  emptyDescription,
  loadingLabel = "در حال دریافت اطلاعات...",
  children,
}) {
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-16 text-textSecondary">
        <Spinner size="lg" />
        <p className="text-sm">{loadingLabel}</p>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-Danger/20 bg-Danger/5 py-16 text-center">
        <span className="flex size-12 items-center justify-center rounded-2xl bg-Danger/10 text-Danger">
          <AlertTriangle size={22} />
        </span>
        <div>
          <p className="font-medium text-textPrimary">دریافت اطلاعات با خطا مواجه شد</p>
          <p className="mt-1 max-w-sm text-sm text-textMuted">
            {error?.message || "لطفاً اتصال اینترنت خود را بررسی و دوباره تلاش کنید."}
          </p>
        </div>
        {onRetry && (
          <Button variant="secondary" size="sm" icon={<RotateCcw size={15} />} onClick={onRetry}>
            تلاش مجدد
          </Button>
        )}
      </div>
    );
  }

  if (isEmpty) {
    return (
      <EmptyState icon={emptyIcon} title={emptyTitle} description={emptyDescription} />
    );
  }

  return children;
}

export default QueryState;
