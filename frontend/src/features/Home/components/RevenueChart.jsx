import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import Card from "../../../components/ui/Card/Card";

const number = new Intl.NumberFormat("fa-IR");
const day = new Intl.DateTimeFormat("fa-IR", { weekday: "short", timeZone: "UTC" });
function RevenueTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return <div dir="rtl" className="rounded-lg border border-Border bg-Surface p-3 text-sm shadow-Dropdown"><p className="text-textSecondary">{label}</p><p className="mt-1 font-bold text-primary">{number.format(payload[0].value)} تومان</p></div>;
}
export default function RevenueChart({ data }) {
  const chartData = data.map((item) => ({ ...item, day: day.format(new Date(item.date)) }));
  return <Card className="min-w-0 p-5 text-start">
    <h2 className="font-bold text-textPrimary">فروش در هفت روز گذشته</h2><p className="mt-1 text-xs text-textSecondary">مبلغ سفارش‌های ثبت‌شده، بدون سفارش‌های لغوشده</p>
    <div className="mt-6 h-64 w-full min-w-0" dir="ltr" role="img" aria-label="نمودار مبلغ فروش در هفت روز گذشته">
      <ResponsiveContainer width="100%" height="100%"><AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
        <CartesianGrid stroke="var(--color-Border)" vertical={false} strokeDasharray="4 4" />
        <XAxis dataKey="day" fontSize={11} tickLine={false} axisLine={false} stroke="var(--color-textSecondary)" />
        <YAxis width={58} fontSize={11} tickLine={false} axisLine={false} stroke="var(--color-textSecondary)" tickFormatter={(value) => number.format(value / 1000000) + "م"} />
        <Tooltip content={<RevenueTooltip />} />
        <Area type="monotone" dataKey="revenue" name="فروش" stroke="var(--color-primary)" strokeWidth={2.5} fill="var(--color-primary-100)" isAnimationActive={false} />
      </AreaChart></ResponsiveContainer>
    </div>
    <details className="mt-3 text-xs text-textSecondary"><summary className="cursor-pointer">نمایش ارقام روزانه</summary><ul className="mt-3 grid gap-2 sm:grid-cols-2">{chartData.map((item) => <li key={item.date}>{item.day}: {number.format(item.revenue)} تومان</li>)}</ul></details>
  </Card>;
}
