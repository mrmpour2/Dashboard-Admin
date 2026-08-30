import { Users, Package, Ticket, Wallet } from "lucide-react";
import StatCard from "./components/StatCard";
import RevenueChart from "./components/RevenueChart";
import RecentActivity from "./components/RecentActivity";

const stats = [
  {
    title: "درآمد کل",
    value: "۴۲,۸۰۰,۰۰۰ ت",
    delta: "۱۲.۴٪",
    isPositive: true,
    icon: Wallet,
  },
  {
    title: "کاربران فعال",
    value: "۲,۳۴۱",
    delta: "۸.۱٪",
    isPositive: true,
    icon: Users,
  },
  {
    title: "سفارش‌های جدید",
    value: "۵۷۶",
    delta: "۲.۳٪",
    isPositive: false,
    icon: Package,
  },
  {
    title: "تیکت‌های باز",
    value: "۲۳",
    delta: "۴.۰٪",
    isPositive: true,
    icon: Ticket,
  },
];

function Home() {
  return (
    <div className="flex flex-col gap-6 text-right">
      <div className="animate-fade-in">
        <h1 className="font-Outfit text-2xl font-bold text-textPrimary">
          سلام، محمدرضا 👋
        </h1>
        <p className="mt-1 text-sm text-textSecondary">
          خلاصه‌ای از عملکرد امروز کسب‌وکار شما
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat, index) => (
          <StatCard key={stat.title} {...stat} index={index} />
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <div className="xl:col-span-2">
          <RevenueChart />
        </div>
        <RecentActivity />
      </div>
    </div>
  );
}

export default Home;
