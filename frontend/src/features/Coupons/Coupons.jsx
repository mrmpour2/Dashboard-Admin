import { Ticket as CouponIcon } from "lucide-react";
import { Table, Badge } from "../../components/ui";
import useTableData from "../../components/ui/Table/hooks/useTableData";
import { useAuth } from "../../auth/useAuth";
import { useCouponsQuery, useDeleteCouponMutation } from "./hooks/useCouponsQuery";
import DeleteConfirmButton from "../../components/DeleteConfirmButton";
import QueryState from "../../components/QueryState";
import CouponFormModal from "./CouponFormModal";
import useToast from "../../components/ui/Toast/ToastContext/useToast";
import { discountTypeLabels } from "../../utils/enumLabels";

const SEARCHABLE_FIELDS = ["code"];
const currencyFormatter = new Intl.NumberFormat("fa-IR");
const dateFormatter = new Intl.DateTimeFormat("fa-IR", { dateStyle: "medium" });

function formatDiscount(coupon) {
  return coupon.discountType === "PERCENTAGE"
    ? `${currencyFormatter.format(coupon.discountValue)}٪`
    : `${currencyFormatter.format(coupon.discountValue)} ت`;
}

// این کامپوننت باید داخل <Table> رندر شود (نه اینکه خودش <Table> را بسازد)
// چون useTableData به context داخلی Table نیاز دارد.
function CouponsTableBody({ items }) {
  const { user } = useAuth();
  const visibleCoupons = useTableData(items, { searchableFields: SEARCHABLE_FIELDS });
  const { toast } = useToast();
  const deleteCoupon = useDeleteCouponMutation();

  const handleDelete = async (coupon) => {
    try {
      await deleteCoupon.mutateAsync(coupon.id);
      toast.Success(`کد «${coupon.code}» حذف شد`);
    } catch (error) {
      toast.Error(error?.message || "حذف کد تخفیف با خطا مواجه شد");
    }
  };

  const isExpired = (coupon) => coupon.expiresAt && new Date(coupon.expiresAt) < new Date();
  const isMaxedOut = (coupon) => coupon.maxUses !== null && coupon.usedCount >= coupon.maxUses;

  return (
    <>
      <Table.Header>
        <Table.HeaderCell sortKey="code">کد</Table.HeaderCell>
        <th className="px-4 py-2 text-start font-medium text-textSecondary">تخفیف</th>
        <th className="px-4 py-2 text-start font-medium text-textSecondary">استفاده</th>
        <th className="px-4 py-2 text-start font-medium text-textSecondary">انقضا</th>
        <th className="px-4 py-2 text-start font-medium text-textSecondary">وضعیت</th>
        <th className="px-4 py-2 text-start font-medium text-textSecondary">عملیات</th>
      </Table.Header>

      <Table.Body>
        {visibleCoupons.length === 0 ? (
          <Table.Empty colSpan={6} message="هیچ کد تخفیفی با این مشخصات یافت نشد" />
        ) : (
          visibleCoupons.map((coupon) => (
            <Table.Row key={coupon.id}>
              <Table.Cell>
                <span className="font-mono font-bold text-primary">{coupon.code}</span>
              </Table.Cell>
              <Table.Cell>
                {formatDiscount(coupon)}
                <span className="ms-1 text-xs text-textMuted">
                  ({discountTypeLabels[coupon.discountType]})
                </span>
              </Table.Cell>
              <Table.Cell>
                {coupon.usedCount}
                {coupon.maxUses ? ` از ${coupon.maxUses}` : " (نامحدود)"}
              </Table.Cell>
              <Table.Cell>
                {coupon.expiresAt ? dateFormatter.format(new Date(coupon.expiresAt)) : "ندارد"}
              </Table.Cell>
              <Table.Cell>
                {!coupon.isActive ? (
                  <Badge variant="gray">غیرفعال</Badge>
                ) : isExpired(coupon) ? (
                  <Badge variant="danger">منقضی‌شده</Badge>
                ) : isMaxedOut(coupon) ? (
                  <Badge variant="warning">ظرفیت تکمیل</Badge>
                ) : (
                  <Badge variant="success">فعال</Badge>
                )}
              </Table.Cell>
              <Table.Cell>
                <div className="flex items-center gap-1">
                  <CouponFormModal coupon={coupon} />
                  {user?.role === "ADMIN" ? <DeleteConfirmButton
                    itemLabel={coupon.code}
                    onConfirm={() => handleDelete(coupon)}
                    isPending={deleteCoupon.isPending}
                  /> : null}
                </div>
              </Table.Cell>
            </Table.Row>
          ))
        )}
      </Table.Body>
    </>
  );
}

function Coupons() {
  const { data, isLoading, isError, error, refetch } = useCouponsQuery({ pageSize: 50 });
  const items = data?.items || [];

  return (
    <div className="mx-auto max-w-5xl p-4">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-textPrimary">کدهای تخفیف</h1>
        <CouponFormModal />
      </div>

      <QueryState
        isLoading={isLoading}
        isError={isError}
        error={error}
        onRetry={refetch}
        isEmpty={!isLoading && !isError && items.length === 0}
        emptyIcon={CouponIcon}
        emptyTitle="هنوز کد تخفیفی ثبت نشده"
        emptyDescription="با دکمه «افزودن کد تخفیف» اولین کد را بسازید."
      >
        <Table
          variant="striped"
          aria-label="جدول کدهای تخفیف"
          toolbar={<Table.Search placeholder="جستجو بر اساس کد..." />}
        >
          <CouponsTableBody items={items} />
        </Table>
      </QueryState>
    </div>
  );
}

export default Coupons;
