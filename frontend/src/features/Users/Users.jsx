import { useMemo, useState } from "react";
import { useUrlTableState } from "../../hooks/useUrlTableState";
import { useDebouncedValue } from "../../hooks/useDebouncedValue";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Pencil, Trash2, UserPlus } from "lucide-react";
import {
  Avatar,
  Badge,
  Button,
  Card,
  Input,
  Modal,
  Table,
  Pagination,
} from "../../components/ui";
import { useAuth } from "../../auth/useAuth";
import useModal from "../../components/ui/Modal/context/useModal";
import {
  useCreateUser,
  useDeleteUser,
  useUsers,
} from "../../hooks/api/useUsers";
import UserForm from "./components/UserForm";

const roleLabel = { ADMIN: "مدیر کل", MANAGER: "مدیر", STAFF: "کارمند" };
function Users() {
  const { user } = useAuth();
  const canWrite = ["ADMIN", "MANAGER"].includes(user?.role);
  const canCreate = user?.role === "ADMIN";
  const canDelete = user?.role === "ADMIN";
  const [table, setTable] = useUrlTableState({
    page: 1,
    pageSize: 10,
    sortBy: "createdAt",
    sortOrder: "desc",
    search: "",
  });
  const filter = table.search;
  const setFilter = (search) => setTable({ search, page: 1 });
  const debouncedFilter = useDebouncedValue(filter);
  const sortConfig = { key: table.sortBy, direction: table.sortOrder };
  const { data, isLoading, isError, error, refetch } = useUsers({
    page: table.page,
    pageSize: table.pageSize,
    search: debouncedFilter || undefined,
    sortBy: table.sortBy,
    sortOrder: table.sortOrder,
  });
  const deleteMutation = useDeleteUser();
  const users = data?.items ?? [];
  const [selectedRowIds, setSelectedRowIds] = useState(new Set());
  const filterKeys = useMemo(
    () => ["id", "name", "email", "phone", "role", "status"],
    [],
  );

  const handleDelete = async (item) => {
    if (String(item.id) === String(user?.id)) return;
    if (
      !window.confirm(
        `کاربر «${item.name}» حذف شود؟ این عملیات قابل بازگشت نیست.`,
      )
    )
      return;
    await deleteMutation.mutateAsync(item.id);
    setSelectedRowIds((current) => {
      const next = new Set(current);
      next.delete(String(item.id));
      return next;
    });
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
    <section className="space-y-5" aria-labelledby="users-title">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 id="users-title" className="text-2xl font-bold text-textPrimary">
            کاربران
          </h1>
          <p className="mt-1 text-sm text-textSecondary">
            مدیریت کاربران، نقش‌ها و سطح دسترسی
          </p>
        </div>
        {canCreate && (
          <Modal>
            <Modal.Trigger>
              <Button icon={<UserPlus className="size-4" />}>
                افزودن کاربر
              </Button>
            </Modal.Trigger>
            <Modal.Content>
              <Modal.Content.Header>
                <div>
                  <h2 className="text-lg font-bold text-textPrimary">
                    افزودن کاربر
                  </h2>
                  <p className="mt-1 text-xs text-textMuted">
                    ایجاد کاربر جدید با نقش مشخص.
                  </p>
                </div>
              </Modal.Content.Header>
              <Modal.Content.Body>
                <CreateUserForm />
              </Modal.Content.Body>
            </Modal.Content>
          </Modal>
        )}
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card className="p-4 text-right">
          <p className="text-xs text-textMuted">کل کاربران</p>
          <p className="mt-2 text-2xl font-bold text-textPrimary">
            {users.length.toLocaleString("fa-IR")}
          </p>
        </Card>
        <Card className="p-4 text-right">
          <p className="text-xs text-textMuted">کاربران فعال</p>
          <p className="mt-2 text-2xl font-bold text-textPrimary">
            {users
              .filter((u) => u.status === "فعال")
              .length.toLocaleString("fa-IR")}
          </p>
        </Card>
        <Card className="p-4 text-right">
          <p className="text-xs text-textMuted">مجموع سفارش‌ها</p>
          <p className="mt-2 text-2xl font-bold text-textPrimary">
            {users
              .reduce((sum, u) => sum + u.orders, 0)
              .toLocaleString("fa-IR")}
          </p>
        </Card>
      </div>
      {selectedRowIds.size > 0 && (
        <div
          role="status"
          className="rounded-xl bg-primary/5 px-4 py-3 text-sm text-textPrimary"
        >
          {selectedRowIds.size.toLocaleString("fa-IR")} کاربر انتخاب شده است.
        </div>
      )}
      <Card className="overflow-hidden text-right">
        <div className="border-b border-Border p-4">
          <Table.Filter
            value={filter}
            onChange={setFilter}
            placeholder="جستجوی نام، ایمیل، تلفن..."
          />
        </div>
        <Table
          variant="striped"
          selectable
          sortConfig={sortConfig}
          onSortChange={(next) =>
            setTable({
              sortBy: next.key || "createdAt",
              sortOrder: next.direction || "desc",
              page: 1,
            })
          }
          selectedRowIds={selectedRowIds}
          onSelectionChange={setSelectedRowIds}
        >
          <Table.Header>
            <Table.HeaderCell sortKey="id">شناسه</Table.HeaderCell>
            <Table.HeaderCell sortKey="name">کاربر</Table.HeaderCell>
            <Table.HeaderCell sortKey="role">نقش</Table.HeaderCell>
            <Table.HeaderCell>سفارش‌ها</Table.HeaderCell>
            <Table.HeaderCell>خرید</Table.HeaderCell>
            <Table.HeaderCell>وضعیت</Table.HeaderCell>
            {canWrite && <Table.HeaderCell>عملیات</Table.HeaderCell>}
          </Table.Header>
          <Table.Body filter="" filterKeys={filterKeys}>
            {users.map((item) => (
              <Table.Row key={item.id} rowId={item.id} data={item}>
                <Table.Cell>{item.id}</Table.Cell>
                <Table.Cell>
                  <div className="flex items-center gap-2">
                    <Avatar name={item.name} size="sm" />
                    <div>
                      <p className="font-medium text-textPrimary">
                        {item.name}
                      </p>
                      <p className="text-xs text-textMuted" dir="ltr">
                        {item.email}
                      </p>
                    </div>
                  </div>
                </Table.Cell>
                <Table.Cell>{roleLabel[item.role] ?? item.role}</Table.Cell>
                <Table.Cell>{item.orders.toLocaleString("fa-IR")}</Table.Cell>
                <Table.Cell>
                  {item.spent.toLocaleString("fa-IR")} تومان
                </Table.Cell>
                <Table.Cell>
                  <Badge
                    variant={item.status === "فعال" ? "success" : "danger"}
                  >
                    {item.status}
                  </Badge>
                </Table.Cell>
                {canWrite && (
                  <Table.Cell>
                    <div className="flex items-center gap-1">
                      <Modal>
                        <Modal.Trigger aria-label={`ویرایش ${item.name}`}>
                          <Button
                            variant="ghost"
                            size="sm"
                            icon={<Pencil className="size-4" />}
                          >
                            ویرایش
                          </Button>
                        </Modal.Trigger>
                        <Modal.Content>
                          <Modal.Content.Header>
                            <div>
                              <h2 className="text-lg font-bold text-textPrimary">
                                ویرایش کاربر
                              </h2>
                              <p className="mt-1 text-xs text-textMuted">
                                نقش و وضعیت دسترسی را مدیریت کنید.
                              </p>
                            </div>
                          </Modal.Content.Header>
                          <Modal.Content.Body>
                            <UserForm
                              user={{
                                ...item,
                                status:
                                  item.status === "فعال"
                                    ? "ACTIVE"
                                    : item.status === "غیرفعال"
                                      ? "INACTIVE"
                                      : "SUSPENDED",
                              }}
                            />
                          </Modal.Content.Body>
                        </Modal.Content>
                      </Modal>
                      {canDelete && String(item.id) !== String(user?.id) && (
                        <Button
                          variant="ghost"
                          size="sm"
                          icon={<Trash2 className="size-4 text-red-600" />}
                          aria-label={`حذف ${item.name}`}
                          title="حذف کاربر"
                          onClick={() => handleDelete(item)}
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
              <label className="sr-only" htmlFor="users-page-size">
                تعداد در صفحه
              </label>
              <select
                id="users-page-size"
                value={table.pageSize}
                onChange={(e) =>
                  setTable({ pageSize: Number(e.target.value), page: 1 })
                }
                className="h-9 rounded-lg border border-Border bg-Surface px-2 text-sm"
              >
                {[10, 25, 50].map((size) => (
                  <option key={size} value={size}>
                    {size} مورد
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

function CreateUserForm() {
  const { setOpen } = useModal();
  const mutation = useCreateUser();
  const schema = z.object({
    name: z.string().trim().min(2, "نام حداقل ۲ کاراکتر باشد").max(100),
    email: z.string().email("ایمیل معتبر نیست").max(320),
    password: z.string().min(8, "رمز عبور حداقل ۸ کاراکتر باشد").max(128),
    role: z.enum(["ADMIN", "MANAGER", "STAFF"]),
    status: z.enum(["ACTIVE", "INACTIVE", "SUSPENDED"]),
  });
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: (values) => {
      const result = schema.safeParse(values);
      if (result.success) return { values: result.data, errors: {} };
      return {
        values: {},
        errors: Object.fromEntries(
          result.error.issues.map((issue) => [
            issue.path[0],
            { type: "validation", message: issue.message },
          ]),
        ),
      };
    },
    defaultValues: { role: "STAFF", status: "ACTIVE" },
  });
  const submit = async (values) => {
    try {
      await mutation.mutateAsync(values);
      setOpen(false);
    } catch {
      // The mutation error is displayed in the form below.
    }
  };
  return (
    <form
      onSubmit={handleSubmit(submit)}
      className="w-full space-y-4"
      noValidate
    >
      <Input
        label="نام"
        required
        error={errors.name?.message}
        {...register("name")}
      />
      <Input
        label="ایمیل"
        type="email"
        required
        error={errors.email?.message}
        {...register("email")}
      />
      <Input
        label="رمز عبور"
        type="password"
        required
        error={errors.password?.message}
        helperText="حداقل ۸ کاراکتر"
        {...register("password")}
      />
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <label className="text-sm font-medium">نقش</label>
          <select
            className="h-11 w-full rounded-xl border border-Border bg-Surface px-3"
            {...register("role")}
          >
            <option value="STAFF">کارمند</option>
            <option value="MANAGER">مدیر</option>
            <option value="ADMIN">مدیر کل</option>
          </select>
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium">وضعیت</label>
          <select
            className="h-11 w-full rounded-xl border border-Border bg-Surface px-3"
            {...register("status")}
          >
            <option value="ACTIVE">فعال</option>
            <option value="INACTIVE">غیرفعال</option>
            <option value="SUSPENDED">مسدود</option>
          </select>
        </div>
      </div>
      {mutation.isError && (
        <p role="alert" className="text-sm text-red-600">
          ایجاد کاربر ناموفق بود. ایمیل تکراری یا اطلاعات نامعتبر را بررسی کنید.
        </p>
      )}
      <div className="flex justify-end gap-2 border-t border-Border pt-4">
        <Button
          type="button"
          variant="secondary"
          onClick={() => setOpen(false)}
        >
          انصراف
        </Button>
        <Button type="submit" loading={mutation.isPending}>
          ایجاد کاربر
        </Button>
      </div>
    </form>
  );
}

export default Users;
