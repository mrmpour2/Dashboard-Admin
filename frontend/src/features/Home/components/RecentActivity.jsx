import { Link } from "react-router";
import Card from "../../../components/ui/Card/Card";
import Badge from "../../../components/ui/Badge/Badge";
import { orderStatusLabels } from "../../../utils/enumLabels";
const number = new Intl.NumberFormat("fa-IR");
const variants = { PENDING: "warning", PROCESSING: "info", SHIPPED: "brand", DELIVERED: "success", CANCELLED: "danger" };
export default function RecentActivity({ orders }) {
  return <Card className="p-5 text-start"><div className="flex items-center justify-between gap-3"><h2 className="font-bold text-textPrimary">آخرین سفارش‌ها</h2><Link to="/orders" className="text-xs font-medium text-primary hover:underline">همهٔ سفارش‌ها</Link></div>
    {orders.length ? <ul className="mt-4 divide-y divide-Border">{orders.map((order) => <li key={order.id} className="flex items-center justify-between gap-3 py-4"><div className="min-w-0"><p className="truncate text-sm font-medium">{order.customer?.name}</p><p className="mt-1 truncate text-xs text-textSecondary" dir="ltr">{order.orderNumber}</p><p className="mt-2 text-sm">{number.format(order.totalAmount)} تومان</p></div><Badge variant={variants[order.status]}>{orderStatusLabels[order.status]}</Badge></li>)}</ul> : <div className="flex min-h-64 flex-col items-center justify-center gap-3 text-sm text-textSecondary"><p>هنوز سفارشی ثبت نشده است.</p><Link to="/orders" className="text-primary">ثبت اولین سفارش</Link></div>}
  </Card>;
}
