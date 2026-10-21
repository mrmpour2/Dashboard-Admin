import { Link } from "react-router";
import { Users, ShoppingBag, Ticket, Wallet, ArrowLeft, PackageCheck } from "lucide-react";
import StatCard from "./components/StatCard";
import RevenueChart from "./components/RevenueChart";
import RecentActivity from "./components/RecentActivity";
import QueryState from "../../components/QueryState";
import { useDashboard } from "./useDashboard";

const number = new Intl.NumberFormat("fa-IR");
const statDefinitions = [
  { key: "revenue", title: "مجموع فروش", suffix: "تومان", icon: Wallet },
  { key: "orders", title: "سفارش ثبت‌شده", suffix: "سفارش", icon: ShoppingBag },
  { key: "activeUsers", title: "کاربران فعال", suffix: "نفر", icon: Users },
  { key: "openTickets", title: "تیکت در انتظار پاسخ", suffix: "تیکت", icon: Ticket },
];

export default function Home() {
  const { data, isLoading, isError, error, refetch } = useDashboard();
  const stats = data?.stats || {};
  return (
    <section className="space-y-6" aria-labelledby="dashboard-title">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div><h1 id="dashboard-title" className="text-2xl font-bold text-textPrimary">نمای کلی فروشگاه</h1><p className="mt-2 text-sm text-textSecondary">از سفارش تازه تا پاسخ به مشتری؛ جریان کار را همین‌جا دنبال کنید.</p></div>
        <time className="text-sm text-textSecondary" dateTime={new Date().toISOString()}>{new Intl.DateTimeFormat("fa-IR", { dateStyle: "long" }).format(new Date())}</time>
      </div>
      <QueryState isLoading={isLoading} isError={isError} error={error} onRetry={refetch}>
        <div className="space-y-6">
          <div className="operation-banner grid gap-6 rounded-2xl border border-primary/20 bg-primary-50 p-6 sm:p-8 lg:grid-cols-[1.5fr_1fr]">
            <div>
              <div className="mb-4 inline-flex items-center gap-2 text-sm font-medium text-primary"><PackageCheck size={19} /> میز عملیات</div>
              <h2 className="text-2xl font-bold leading-relaxed text-textPrimary">{stats.pendingOrders ? number.format(stats.pendingOrders) + " سفارش آمادهٔ بررسی است" : "سفارش‌های تازه را از اینجا مدیریت کنید"}</h2>
              <p className="mt-3 max-w-lg text-sm leading-7 text-textSecondary">وضعیت سفارش‌ها را به‌روز کنید و مسیر آماده‌سازی تا تحویل را در دست داشته باشید.</p>
              <Link to="/orders" className="mt-5 inline-flex items-center gap-3 rounded-lg bg-primary px-4 py-3 text-sm font-semibold text-white">بررسی سفارش‌ها <ArrowLeft size={17} /></Link>
            </div>
            <div className="grid content-center gap-4 border-t border-primary/15 pt-5 lg:border-t-0 lg:border-s lg:ps-7 lg:pt-0">
              <Link to="/products" className="flex items-center justify-between gap-4"><span><span className="block text-sm font-semibold text-textPrimary">رسیدگی به موجودی</span><span className="mt-1 block text-xs text-textSecondary">محصول با موجودی پنج عدد یا کمتر</span></span><span className="text-3xl font-bold text-primary">{number.format(stats.lowStock || 0)}</span></Link>
              <div className="h-px bg-primary/15" />
              <Link to="/tickets" className="flex items-center justify-between gap-4"><span><span className="block text-sm font-semibold text-textPrimary">پاسخ به مشتری‌ها</span><span className="mt-1 block text-xs text-textSecondary">تیکت باز یا در حال بررسی</span></span><span className="text-3xl font-bold text-primary">{number.format(stats.openTickets || 0)}</span></Link>
            </div>
          </div>
          <div className="grid grid-cols-1 divide-y divide-Border rounded-xl border border-Border bg-Surface sm:grid-cols-2 sm:divide-y-0 xl:grid-cols-4">{statDefinitions.map(({ key, ...stat }) => <StatCard key={key} {...stat} value={number.format(stats[key] || 0)} />)}</div>
          <div className="grid gap-6 xl:grid-cols-[1.3fr_1fr]"><RevenueChart data={data?.weeklyRevenue || []} /><RecentActivity orders={data?.recentOrders || []} /></div>
        </div>
      </QueryState>
    </section>
  );
}
