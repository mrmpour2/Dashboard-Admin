import { Card, Avatar, Badge } from "../../../components/ui";

const activities = [
  {
    id: 1,
    name: "سارا احمدی",
    action: "سفارش جدیدی ثبت کرد",
    time: "۵ دقیقه پیش",
    status: "success",
    statusLabel: "تکمیل شد",
  },
  {
    id: 2,
    name: "علی رضایی",
    action: "تیکت پشتیبانی باز کرد",
    time: "۲۲ دقیقه پیش",
    status: "warning",
    statusLabel: "در انتظار",
  },
  {
    id: 3,
    name: "محمد کریمی",
    action: "پروفایل خود را ویرایش کرد",
    time: "۱ ساعت پیش",
    status: "brand",
    statusLabel: "بروزرسانی",
  },
  {
    id: 4,
    name: "نگار حسینی",
    action: "بازخورد منفی ثبت کرد",
    time: "۳ ساعت پیش",
    status: "danger",
    statusLabel: "بررسی نشده",
  },
];

function RecentActivity() {
  return (
    <Card className="animate-fade-in-up p-5 text-right" style={{ animationDelay: "340ms" }}>
      <div className="mb-4 flex items-center justify-between">
        <h3 className="font-bold text-textPrimary">فعالیت‌های اخیر</h3>
        <button className="text-xs font-medium text-primary hover:underline">
          مشاهده همه
        </button>
      </div>

      <ul className="flex flex-col gap-1">
        {activities.map((item, index) => (
          <li
            key={item.id}
            className="animate-fade-in-up flex items-center gap-3 rounded-xl p-2.5 transition-colors duration-200 hover:bg-SurfaceMuted"
            style={{ animationDelay: `${380 + index * 70}ms` }}
          >
            <Avatar name={item.name} size="sm" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-textPrimary">
                {item.name}
                <span className="font-normal text-textSecondary"> {item.action}</span>
              </p>
              <p className="text-xs text-textMuted">{item.time}</p>
            </div>
            <Badge variant={item.status}>{item.statusLabel}</Badge>
          </li>
        ))}
      </ul>
    </Card>
  );
}

export default RecentActivity;
