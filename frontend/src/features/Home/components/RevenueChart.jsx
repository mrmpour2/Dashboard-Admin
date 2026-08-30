import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import { Card } from "../../../components/ui";

const weeklyData = [
  { day: "شنبه", فروش: 4200, بازدید: 2400 },
  { day: "یکشنبه", فروش: 3100, بازدید: 1980 },
  { day: "دوشنبه", فروش: 5400, بازدید: 3200 },
  { day: "سه‌شنبه", فروش: 4800, بازدید: 2780 },
  { day: "چهارشنبه", فروش: 6100, بازدید: 3908 },
  { day: "پنجشنبه", فروش: 7300, بازدید: 4300 },
  { day: "جمعه", فروش: 6900, بازدید: 4100 },
];

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-Border bg-Surface px-3.5 py-2.5 shadow-Dropdown">
      <p className="mb-1 text-xs font-medium text-textMuted">{label}</p>
      {payload.map((entry) => (
        <p
          key={entry.dataKey}
          className="text-sm font-bold"
          style={{ color: entry.color }}
        >
          {entry.dataKey}: {entry.value.toLocaleString("fa-IR")}
        </p>
      ))}
    </div>
  );
}

function RevenueChart() {
  return (
    <Card className="animate-fade-in-up p-5 text-right" style={{ animationDelay: "260ms" }}>
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h3 className="font-bold text-textPrimary">روند فروش هفته اخیر</h3>
          <p className="text-xs text-textMuted">مقایسه فروش و بازدید روزانه</p>
        </div>
      </div>

      <div className="h-72 w-full" dir="ltr">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={weeklyData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
            <defs>
              <linearGradient id="colorSale" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="var(--color-primary)" stopOpacity={0.35} />
                <stop offset="95%" stopColor="var(--color-primary)" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="colorVisit" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="var(--color-secondary)" stopOpacity={0.3} />
                <stop offset="95%" stopColor="var(--color-secondary)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="4 4" stroke="var(--color-Border)" vertical={false} />
            <XAxis
              dataKey="day"
              stroke="var(--color-textMuted)"
              fontSize={12}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              stroke="var(--color-textMuted)"
              fontSize={12}
              tickLine={false}
              axisLine={false}
              width={46}
              tickFormatter={(value) =>
                value >= 1000 ? `${value / 1000}k` : value
              }
            />
            <Tooltip content={<CustomTooltip />} />
            <Area
              type="monotone"
              dataKey="فروش"
              stroke="var(--color-primary)"
              strokeWidth={2.5}
              fill="url(#colorSale)"
            />
            <Area
              type="monotone"
              dataKey="بازدید"
              stroke="var(--color-secondary)"
              strokeWidth={2.5}
              fill="url(#colorVisit)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}

export default RevenueChart;
