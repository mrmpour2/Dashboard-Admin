import { useState } from "react";
import { Printer } from "lucide-react";
import { Card } from "../../components/ui";
import { formatPrice } from "../../utils/formatPrice.js";
import { useAuth } from "../../auth/useAuth";
import { useSiteOrderQuery, useSiteOrdersQuery, useUpdateSiteOrderStatusMutation } from "./hooks/useOrdersQuery";

const statuses = {
  PENDING_PAYMENT: "در انتظار پرداخت",
  RESERVED: "رزرو شده",
  EXPIRED: "منقضی",
  REFUND_PENDING: "در انتظار بازپرداخت",
  REFUNDED: "بازپرداخت شده",
  CONFIRMED: "تأیید شده",
  PAID: "پرداخت شده",
  PROCESSING: "در حال آماده‌سازی",
  SHIPPED: "ارسال شده",
  DELIVERED: "تحویل شده",
  CANCELLED: "لغو شده",
};
const nextStatuses = {
  CONFIRMED: ["PROCESSING"],
  PAID: ["PROCESSING"],
  PROCESSING: ["SHIPPED"],
  SHIPPED: ["DELIVERED"],
  PENDING_PAYMENT: ["CANCELLED"],
  RESERVED: ["CANCELLED"],
  EXPIRED: ["CANCELLED"],
};
const date = new Intl.DateTimeFormat("fa-IR", { dateStyle: "medium", timeStyle: "short" });

function SiteOrderDetails({ id, onClose }) {
  const { hasRole } = useAuth();
  const { data: order, isLoading, isError, error } = useSiteOrderQuery(id);
  const update = useUpdateSiteOrderStatusMutation();
  const canManage = hasRole("ADMIN", "MANAGER");

  async function changeStatus(status) {
    try {
      await update.mutateAsync({ id, status });
    } catch (err) {
      window.alert(err?.message || "به‌روزرسانی وضعیت ناموفق بود.");
    }
  }

  if (isLoading) return <Card className="mt-4 p-6 text-center">در حال بارگذاری جزئیات سفارش...</Card>;
  if (isError || !order) return <Card role="alert" className="mt-4 p-6">{error?.message || "جزئیات سفارش در دسترس نیست."}</Card>;

  return <Card id="site-order-print" className="mt-4 space-y-5 p-5 text-right">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div><h2 className="text-lg font-bold">جزئیات سفارش {order.orderNumber}</h2><p className="mt-1 text-xs text-textSecondary">{date.format(new Date(order.createdAt))}</p></div>
      <div className="flex flex-wrap gap-2 print:hidden">
        <button type="button" onClick={() => window.print()} className="inline-flex items-center gap-2 rounded-lg border border-Border px-3 py-2 text-sm"><Printer size={16} /> چاپ</button>
        <button type="button" onClick={onClose} className="rounded-lg border border-Border px-3 py-2 text-sm">بستن جزئیات</button>
      </div>
    </div>
    <div className="grid gap-3 rounded-lg bg-SurfaceMuted p-4 sm:grid-cols-2">
      <p><span className="text-textSecondary">مشتری: </span>{order.customerName}</p>
      <p><span className="text-textSecondary">موبایل: </span><span dir="ltr">{order.customerPhone}</span></p>
      {order.customerEmail && <p><span className="text-textSecondary">ایمیل: </span>{order.customerEmail}</p>}
      {order.shippingAddress && <p className="sm:col-span-2"><span className="text-textSecondary">نشانی: </span>{order.shippingAddress}</p>}
      <p><span className="text-textSecondary">وضعیت سفارش: </span>{statuses[order.status] || order.status}</p>
      <p><span className="text-textSecondary">روش پرداخت: </span>{order.paymentMethod || "ثبت نشده"}</p>
      <p className="sm:col-span-2"><span className="text-textSecondary">پرداخت‌ها: </span>{order.payments.length ? order.payments.map((payment) => `${payment.method} / ${payment.status} / ${formatPrice(payment.amountToman)}`).join("؛ ") : "داده‌ای ثبت نشده"}</p>
    </div>
    <div className="overflow-x-auto" data-lenis-prevent>
      <table className="w-full min-w-[560px] text-sm"><thead><tr className="border-b border-Border text-start text-textSecondary"><th className="p-3">قلم</th><th className="p-3">سایز/افزودنی</th><th className="p-3">تعداد</th><th className="p-3">قیمت واحد</th><th className="p-3">جمع</th></tr></thead>
        <tbody>{order.items.map((item) => <tr key={item.id} className="border-b border-Border"><td className="p-3">{item.productName}</td><td className="p-3">{[item.variantLabel, ...(item.selectedOptions || []).map((option) => option.label), item.parentProductName ? `افزودنی برای ${item.parentProductName}` : null].filter(Boolean).join(" · ") || "—"}</td><td className="p-3">{item.quantity.toLocaleString("fa-IR")}</td><td className="p-3">{formatPrice(item.unitPrice)}</td><td className="p-3">{formatPrice(Number(item.unitPrice) * item.quantity)}</td></tr>)}</tbody>
      </table>
    </div>
    <div className="grid gap-2 text-sm sm:grid-cols-2">
      <p>جمع اقلام: <strong>{formatPrice(order.subtotalAmount)}</strong></p><p>هزینه‌ی ارسال: <strong>{formatPrice(order.deliveryFeeAmount)}</strong></p>
      <p>مالیات: <strong>{formatPrice(order.taxAmount)}</strong></p><p>مبلغ کل: <strong>{formatPrice(order.totalAmount)}</strong></p>
    </div>
    {order.statusHistory.length > 0 && <section><h3 className="font-bold">تاریخچه‌ی وضعیت</h3><ol className="mt-2 space-y-2">{order.statusHistory.map((entry, index) => <li key={`${entry.createdAt}-${index}`} className="rounded-lg border border-Border p-3 text-sm">{statuses[entry.from] || entry.from} ← {statuses[entry.to] || entry.to}<span className="ms-2 text-xs text-textSecondary">{date.format(new Date(entry.createdAt))}</span></li>)}</ol></section>}
    {canManage && (nextStatuses[order.status] || []).length > 0 && <div className="flex flex-wrap gap-2 border-t border-Border pt-4 print:hidden"><span className="self-center text-sm text-textSecondary">تغییر وضعیت:</span>{nextStatuses[order.status].map((status) => <button key={status} type="button" disabled={update.isPending} onClick={() => void changeStatus(status)} className="rounded-lg bg-primary px-3 py-2 text-sm font-medium text-white disabled:opacity-50">{statuses[status]}</button>)}</div>}
  </Card>;
}

export default function SiteOrdersPanel() {
  const [status, setStatus] = useState("");
  const [selectedId, setSelectedId] = useState("");
  const { data, isLoading, isError, error, refetch } = useSiteOrdersQuery({ pageSize: 50, ...(status ? { status } : {}) });
  const orders = data?.items ?? [];

  return <section aria-labelledby="site-orders-title" className="mt-5">
    <div className="mb-3 flex flex-wrap items-end justify-between gap-3"><div><h2 id="site-orders-title" className="text-xl font-bold">سفارش‌های ثبت‌شده در سایت</h2><p className="mt-1 text-sm text-textSecondary">اطلاعات پرداخت و اقلام از سفارش واقعی سایت خوانده می‌شود.</p></div><select value={status} onChange={(event) => setStatus(event.target.value)} aria-label="فیلتر وضعیت سفارش سایت" className="rounded-lg border border-Border bg-Surface px-3 py-2 text-sm"><option value="">همه‌ی وضعیت‌ها</option>{Object.entries(statuses).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></div>
    {isLoading ? <Card className="p-6 text-center">در حال بارگذاری سفارش‌ها...</Card> : isError ? <Card role="alert" className="p-6">{error?.message || "دریافت سفارش‌های سایت ناموفق بود."}<button type="button" onClick={() => void refetch()} className="ms-3 text-primary">تلاش دوباره</button></Card> : orders.length === 0 ? <Card className="p-6 text-center text-textSecondary">سفارشی با این وضعیت ثبت نشده است.</Card> : <Card className="overflow-x-auto" data-lenis-prevent><table className="w-full min-w-[700px] text-sm"><thead><tr className="border-b border-Border text-start text-textSecondary"><th className="p-3">شماره</th><th className="p-3">مشتری</th><th className="p-3">اقلام</th><th className="p-3">مبلغ</th><th className="p-3">وضعیت</th><th className="p-3">زمان</th><th className="p-3">جزئیات</th></tr></thead><tbody>{orders.map((order) => <tr key={order.id} className="border-b border-Border"><td className="p-3 font-mono" dir="ltr">{order.orderNumber}</td><td className="p-3">{order.customerName}</td><td className="p-3">{order.itemCount.toLocaleString("fa-IR")}</td><td className="p-3">{formatPrice(order.totalAmount)}</td><td className="p-3">{statuses[order.status] || order.status}</td><td className="p-3">{date.format(new Date(order.createdAt))}</td><td className="p-3"><button type="button" onClick={() => setSelectedId(selectedId === order.id ? "" : order.id)} className="text-primary hover:underline">{selectedId === order.id ? "بستن" : "بازکردن"}</button></td></tr>)}</tbody></table></Card>}
    {selectedId && <SiteOrderDetails key={selectedId} id={selectedId} onClose={() => setSelectedId("")} />}
  </section>;
}
