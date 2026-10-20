import { useMemo } from "react";
import { useUrlTableState } from "../../hooks/useUrlTableState";
import { useDebouncedValue } from "../../hooks/useDebouncedValue";
import { Pagination } from "../../components/ui";
import { Package, Pencil, Plus, Trash2 } from "lucide-react";
import { Badge, Button, Card, Modal, Table } from "../../components/ui";
import { useAuth } from "../../auth/useAuth";
import { useDeleteProduct, useProducts } from "../../hooks/api/useProducts";
import ProductForm from "./components/ProductForm";

const statusVariant = {
  موجود: "success",
  کم‌موجود: "warning",
  ناموجود: "danger",
};

function Products() {
  const { user } = useAuth();
  const canWrite = ["ADMIN", "MANAGER"].includes(user?.role);
  const canDelete = user?.role === "ADMIN";
  const [table, setTable] = useUrlTableState({
    page: 1,
    pageSize: 5,
    sortBy: "createdAt",
    sortOrder: "desc",
    search: "",
  });
  const filter = table.search;
  const setFilter = (search) => setTable({ search, page: 1 });
  const debouncedFilter = useDebouncedValue(filter);
  const sortConfig = { key: table.sortBy, direction: table.sortOrder };
  const { data, isLoading, isError, error, refetch } = useProducts({
    page: table.page,
    pageSize: table.pageSize,
    search: debouncedFilter || undefined,
    sortBy: table.sortBy,
    sortOrder: table.sortOrder,
  });
  const deleteMutation = useDeleteProduct();
  const products = data?.items ?? [];
  const pagination = data?.pagination;
  const filterKeys = useMemo(() => ["id", "title", "category", "status"], []);
  const totalValue = products.reduce(
    (sum, item) => sum + Number(item.price) * Number(item.stock),
    0,
  );

  const handleDelete = async (product) => {
    if (
      !window.confirm(
        `محصول «${product.title}» حذف شود؟ این عملیات قابل بازگشت نیست.`,
      )
    )
      return;
    try { await deleteMutation.mutateAsync(product.id); } catch { /* Error is shown below. */ }
  };

  if (isLoading)
    return (
      <div className="rounded-xl border border-Border p-8 text-center text-textSecondary">
        در حال دریافت اطلاعات...
      </div>
    );
  if (isError)
    return (
      <div
        role="alert"
        className="rounded-xl border border-Border p-8 text-center text-textSecondary"
      >
        <p>{error?.message ?? "دریافت اطلاعات ناموفق بود."}</p>
        <button
          className="mt-3 text-primary hover:underline"
          onClick={() => refetch()}
        >
          تلاش مجدد
        </button>
      </div>
    );

  return (
    <section className="space-y-5" aria-labelledby="products-title">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1
            id="products-title"
            className="text-2xl font-bold text-textPrimary"
          >
            محصولات
          </h1>
          <p className="mt-1 text-sm text-textSecondary">
            مدیریت موجودی، قیمت و عملکرد محصولات فروشگاه
          </p>
        </div>
        {canWrite && (
          <Modal>
            <Modal.Trigger>
              <Button icon={<Plus className="size-4" />}>افزودن محصول</Button>
            </Modal.Trigger>
            <Modal.Content className="max-w-2xl">
              <Modal.Content.Header>
                <div>
                  <h2 className="text-lg font-bold text-textPrimary">
                    افزودن محصول
                  </h2>
                  <p className="mt-1 text-xs text-textMuted">
                    اطلاعات محصول جدید را وارد کنید.
                  </p>
                </div>
              </Modal.Content.Header>
              <Modal.Content.Body>
                <ProductForm />
              </Modal.Content.Body>
            </Modal.Content>
          </Modal>
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card className="p-4 text-right">
          <p className="text-xs text-textMuted">کل محصولات</p>
          <p className="mt-2 text-2xl font-bold text-textPrimary">
            {(pagination?.total ?? products.length).toLocaleString("fa-IR")}
          </p>
        </Card>
        <Card className="p-4 text-right">
          <p className="text-xs text-textMuted">موجودی بحرانی</p>
          <p className="mt-2 text-2xl font-bold text-textPrimary">
            {products
              .filter((p) => p.stock <= 5)
              .length.toLocaleString("fa-IR")}
          </p>
        </Card>
        <Card className="p-4 text-right">
          <p className="text-xs text-textMuted">ارزش موجودی</p>
          <p className="mt-2 text-xl font-bold text-textPrimary">
            {totalValue.toLocaleString("fa-IR")} تومان
          </p>
        </Card>
      </div>

      {deleteMutation.isError ? <p role="alert" className="p-4 text-sm text-Danger">{deleteMutation.error.message}</p> : null}
      <Card className="overflow-hidden text-right">
        <div className="flex flex-col gap-3 border-b border-Border p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <Package className="size-5 text-primary" />
            <span className="font-bold text-textPrimary">فهرست محصولات</span>
          </div>
          <Table.Filter
            value={filter}
            onChange={setFilter}
            placeholder="جستجوی محصول، دسته‌بندی..."
          />
        </div>
        <Table
          variant="striped"
          sortConfig={sortConfig}
          onSortChange={(next) =>
            setTable({
              sortBy: next.key || "createdAt",
              sortOrder: next.direction || "desc",
              page: 1,
            })
          }
        >
          <Table.Header>
            <Table.HeaderCell sortKey="id">شناسه</Table.HeaderCell>
            <Table.HeaderCell sortKey="name">محصول</Table.HeaderCell>
            <Table.HeaderCell sortKey="category">دسته‌بندی</Table.HeaderCell>
            <Table.HeaderCell sortKey="price">قیمت</Table.HeaderCell>
            <Table.HeaderCell sortKey="stock">موجودی</Table.HeaderCell>
            <Table.HeaderCell>تعداد فروش</Table.HeaderCell>
            <Table.HeaderCell>وضعیت</Table.HeaderCell>
            {canWrite && <Table.HeaderCell>عملیات</Table.HeaderCell>}
          </Table.Header>
          <Table.Body filter="" filterKeys={filterKeys}>
            {products.map((product) => (
              <Table.Row key={product.id} rowId={product.id} data={product}>
                <Table.Cell dir="ltr">{product.id}</Table.Cell>
                <Table.Cell className="font-medium text-textPrimary">
                  {product.title}
                </Table.Cell>
                <Table.Cell>{product.category || "—"}</Table.Cell>
                <Table.Cell>
                  {Number(product.price).toLocaleString("fa-IR")} تومان
                </Table.Cell>
                <Table.Cell>
                  {Number(product.stock).toLocaleString("fa-IR")}
                </Table.Cell>
                <Table.Cell>
                  {Number(product.sold).toLocaleString("fa-IR")}
                </Table.Cell>
                <Table.Cell>
                  <Badge variant={statusVariant[product.status]}>
                    {product.status}
                  </Badge>
                </Table.Cell>
                {canWrite && (
                  <Table.Cell>
                    <div className="flex items-center gap-1">
                      <Modal>
                        <Modal.Trigger
                          title="ویرایش محصول"
                          aria-label={`ویرایش ${product.title}`}
                        >
                          <Button
                            variant="ghost"
                            size="sm"
                            icon={<Pencil className="size-4" />}
                          >
                            ویرایش
                          </Button>
                        </Modal.Trigger>
                        <Modal.Content className="max-w-2xl">
                          <Modal.Content.Header>
                            <div>
                              <h2 className="text-lg font-bold text-textPrimary">
                                ویرایش محصول
                              </h2>
                              <p className="mt-1 text-xs text-textMuted">
                                تغییرات پس از ذخیره در فهرست اعمال می‌شود.
                              </p>
                            </div>
                          </Modal.Content.Header>
                          <Modal.Content.Body>
                            <ProductForm product={product} />
                          </Modal.Content.Body>
                        </Modal.Content>
                      </Modal>
                      {canDelete && (
                        <Button
                          variant="ghost"
                          size="sm"
                          title="حذف محصول"
                          aria-label={`حذف ${product.title}`}
                          icon={<Trash2 className="size-4 text-red-600" />}
                          onClick={() => handleDelete(product)}
                          loading={deleteMutation.isPending}
                        />
                      )}
                    </div>
                  </Table.Cell>
                )}
              </Table.Row>
            ))}
          </Table.Body>
        </Table>
        <div className="border-t border-Border p-4">
          <Pagination
            currentPage={data?.pagination?.page ?? table.page}
            totalItems={data?.pagination?.total ?? 0}
            pageSize={table.pageSize}
            onPageChange={(page) => setTable({ page })}
          >
            <Pagination.Info />
            <div className="flex items-center gap-2">
              <label className="sr-only" htmlFor="page-size">
                تعداد در صفحه
              </label>
              <select
                id="page-size"
                value={table.pageSize}
                onChange={(e) =>
                  setTable({ pageSize: Number(e.target.value), page: 1 })
                }
                className="h-9 rounded-lg border border-Border bg-Surface px-2 text-sm"
              >
                {[5, 10, 25, 50].map((size) => (
                  <option key={size} value={size}>
                    {size.toLocaleString("fa-IR")} مورد
                  </option>
                ))}
              </select>
              <Pagination.Prev />
              <Pagination.Pages />
              <Pagination.Next />
            </div>
          </Pagination>
        </div>
      </Card>
    </section>
  );
}
export default Products;
