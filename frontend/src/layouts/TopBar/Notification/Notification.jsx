import { Bell } from "lucide-react";
import { Link } from "react-router";
import Dropdown from "../../../components/ui/Dropdown/Dropdown";
import { useDashboard } from "../../../features/Home/useDashboard";

/**
 * زنگ «کارهای در انتظار» در TopBar.
 *
 * عددها از `GET /api/dashboard` می‌آیند (بدون دادهٔ ساختگی): تیکت‌های باز،
 * سفارش‌های در انتظار بررسی و نظرهای تأییدنشدهٔ مشتریان. هر ردیف به صفحهٔ
 * مربوط به خودش لینک است تا مدیر یک کلیک تا اقدام فاصله داشته باشد.
 */
export default function Notification() {
  const { data } = useDashboard();
  const tickets = data?.stats?.openTickets || 0;
  const orders = data?.stats?.pendingOrders || 0;
  const reviews = data?.stats?.pendingReviews || 0;
  const hasWork = tickets + orders + reviews > 0;

  return (
    <Dropdown>
      <Dropdown.Trigger>
        <button
          type="button"
          aria-label="کارهای در انتظار"
          className="relative rounded-lg p-2.5 text-textSecondary hover:bg-SurfaceMuted"
        >
          <Bell size={20} />
          {hasWork ? (
            <span className="absolute end-1 top-1 size-2 rounded-full bg-secondary" />
          ) : null}
        </button>
      </Dropdown.Trigger>
      <Dropdown.Content align="end">
        <div className="w-64 rounded-xl border border-Border bg-Surface p-4 shadow-Dropdown">
          <h3 className="mb-3 text-sm font-bold">کارهای در انتظار</h3>

          <Link to="/comments" className="block rounded-lg py-2 text-sm text-primary">
            {reviews.toLocaleString("fa-IR")} نظر در انتظار بررسی
          </Link>

          <Link to="/tickets" className="block rounded-lg py-2 text-sm text-primary">
            {tickets.toLocaleString("fa-IR")} تیکت نیازمند پاسخ
          </Link>

          <Link to="/orders" className="block rounded-lg py-2 text-sm text-primary">
            {orders.toLocaleString("fa-IR")} سفارش نیازمند بررسی
          </Link>

          {hasWork ? null : (
            <p className="pt-2 text-xs text-textMuted">فعلاً کاری در انتظار بررسی نیست.</p>
          )}
        </div>
      </Dropdown.Content>
    </Dropdown>
  );
}
