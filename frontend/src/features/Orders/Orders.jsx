import { ShoppingCart } from "lucide-react";
import { Table, Avatar } from "../../components/ui";
import useTableData from "../../components/ui/Table/hooks/useTableData";
import { useAuth } from "../../auth/useAuth";
import { useOrdersQuery, useUpdateOrderStatusMutation } from "./hooks/useOrdersQuery";
import QueryState from "../../components/QueryState";
import CreateOrderModal from "./CreateOrderModal";
import useToast from "../../components/ui/Toast/ToastContext/useToast";
import { orderStatusLabels } from "../../utils/enumLabels";
import { formatPrice } from "../../utils/formatPrice.js";
import { useState } from "react";
import SiteOrdersPanel from "./SiteOrdersPanel";

const dateFormatter = new Intl.DateTimeFormat("fa-IR", { dateStyle: "medium" });
const SEARCHABLE_FIELDS = ["orderNumber"];
const statusOptions = Object.entries(orderStatusLabels);

const STATUS_SELECT_CLASSES = {
  PENDING: "bg-Warning/10 text-Warning",
  PROCESSING: "bg-Info/10 text-Info",
  SHIPPED: "bg-primary/10 text-primary",
  DELIVERED: "bg-Success/10 text-Success",
  CANCELLED: "bg-Danger/10 text-Danger",
};

// این کامپوننت باید داخل <Table> رندر شود، نه اینکه خودش <Table> را بسازد —
// چون useTableData به context داخلی Table (از طریق useTable()) نیاز دارد.
function OrdersTableBody({ items }) {
  const { hasRole } = useAuth();
  const visibleOrders = useTableData(items, { searchableFields: SEARCHABLE_FIELDS });
  const { toast } = useToast();
  const updateStatus = useUpdateOrderStatusMutation();

  const handleStatusChange = async (order, status) => {
    if (status === order.status) return;
    try {
      await updateStatus.mutateAsync({ id: order.id, status });
      toast.Success("وضعیت سفارش به‌روزرسانی شد");
    } catch (error) {
      toast.Error(error?.message || "به‌روزرسانی وضعیت با خطا مواجه شد");
    }
  };

  return (
    <>
      <Table.Header>
        <Table.HeaderCell sortKey="orderNumber">شماره سفارش</Table.HeaderCell>
        <th className="px-4 py-2 text-start font-medium text-textSecondary">مشتری</th>
        <th className="px-4 py-2 text-start font-medium text-textSecondary">اقلام</th>
        <Table.HeaderCell sortKey="totalAmount">مبلغ کل</Table.HeaderCell>
        <Table.HeaderCell sortKey="createdAt">تاریخ ثبت</Table.HeaderCell>
        <th className="px-4 py-2 text-start font-medium text-textSecondary">وضعیت</th>
      </Table.Header>

      <Table.Body>
        {visibleOrders.length === 0 ? (
          <Table.Empty colSpan={6} message="هیچ سفارشی با این مشخصات یافت نشد" />
        ) : (
          visibleOrders.map((order) => (
            <Table.Row key={order.id}>
              <Table.Cell>
                <span className="font-mono text-xs text-textSecondary">{order.orderNumber}</span>
              </Table.Cell>
              <Table.Cell>
                <div className="flex items-center gap-2">
                  <Avatar name={order.customer?.name} src={order.customer?.avatarUrl} size="sm" />
                  <span>{order.customer?.name}</span>
                </div>
              </Table.Cell>
              <Table.Cell>{order.items?.length || 0} قلم</Table.Cell>
              <Table.Cell>
                <span className="font-medium text-textPrimary">
                  {formatPrice(order.totalAmount)}
                </span>
                {order.discountAmount > 0 && (
                  <span className="ms-1.5 text-xs text-profit">
                    (کد {order.coupon?.code}: ‎-{formatPrice(order.discountAmount)})
                  </span>
                )}
              </Table.Cell>
              <Table.Cell>{dateFormatter.format(new Date(order.createdAt))}</Table.Cell>
              <Table.Cell>
                <div onClick={(e) => e.stopPropagation()}>
                  <select
                    value={order.status}
                    onChange={(e) => handleStatusChange(order, e.target.value)}
                    aria-label={`وضعیت سفارش ${order.orderNumber}`}
                    disabled={updateStatus.isPending || order.status === "CANCELLED" || !hasRole("ADMIN", "MANAGER")}
                    className={`rounded-Button border-0 px-2 py-1 text-xs font-medium outline-none transition-colors disabled:opacity-50 ${STATUS_SELECT_CLASSES[order.status]}`}
                  >
                    {statusOptions.map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                </div>
              </Table.Cell>
            </Table.Row>
          ))
        )}
      </Table.Body>
    </>
  );
}

function Orders() {
  const [orderSource, setOrderSource] = useState("site");
  const { hasRole } = useAuth();
  const { data, isLoading, isError, error, refetch } = useOrdersQuery({ pageSize: 50 });
  const items = data?.items || [];

  return (
    <div className="mx-auto max-w-5xl p-4">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-textPrimary">مدیریت سفارش‌ها</h1>
        {orderSource === "panel" && <CreateOrderModal />}
      </div>

      <div className="mb-4 flex gap-2" role="tablist" aria-label="منبع سفارش‌ها">
        <button type="button" role="tab" aria-selected={orderSource === "site"} onClick={() => setOrderSource("site")} className={`rounded-lg px-4 py-2 text-sm ${orderSource === "site" ? "bg-primary text-white" : "border border-Border text-textSecondary"}`}>سفارش‌های سایت</button>
        {hasRole("ADMIN", "MANAGER") && <button type="button" role="tab" aria-selected={orderSource === "panel"} onClick={() => setOrderSource("panel")} className={`rounded-lg px-4 py-2 text-sm ${orderSource === "panel" ? "bg-primary text-white" : "border border-Border text-textSecondary"}`}>سفارش‌های ثبت‌شده در پنل</button>}
      </div>

      {orderSource === "site" ? <SiteOrdersPanel /> : <>

      <QueryState
        isLoading={isLoading}
        isError={isError}
        error={error}
        onRetry={refetch}
        isEmpty={!isLoading && !isError && items.length === 0}
        emptyIcon={ShoppingCart}
        emptyTitle="هنوز سفارشی ثبت نشده"
        emptyDescription="با دکمه «سفارش جدید» اولین سفارش را ثبت کنید."
      >
        <Table
          variant="striped"
          aria-label="جدول سفارشات"
          toolbar={<Table.Search placeholder="جستجو بر اساس شماره سفارش..." />}
        >
          <OrdersTableBody items={items} />
        </Table>
      </QueryState>
      </>}
    </div>
  );
}

export default Orders;
