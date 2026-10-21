import { useForm } from "react-hook-form";
import { useAuth } from "../../../auth/useAuth";
import { z } from "zod";
import { Button, Input } from "../../../components/ui";
import useModal from "../../../components/ui/Modal/context/useModal";
import { useUpdateUser } from "../../../hooks/api/useUsers";

const schema = z.object({
  name: z.string().trim().min(2, "نام حداقل ۲ کاراکتر باشد").max(100),
  role: z.enum(["ADMIN", "MANAGER", "STAFF"]),
  status: z.enum(["ACTIVE", "INACTIVE", "SUSPENDED"]),
});

export default function UserForm({ user }) {
  const { setOpen } = useModal();
  const { user: currentUser } = useAuth();
  const isSelf = currentUser.id === user.id;
  const canChangeRole = currentUser.role === "ADMIN" && !isSelf;
  const mutation = useUpdateUser();
  const { register, handleSubmit, formState: { errors } } = useForm({
    resolver: (values) => {
      const result = schema.safeParse(values);
      if (result.success) return { values: result.data, errors: {} };
      const errors = Object.fromEntries(result.error.issues.map((issue) => [issue.path[0], { type: "validation", message: issue.message }]));
      return { values: {}, errors };
    },
    defaultValues: { name: user.name ?? "", role: user.role ?? "STAFF", status: user.status ?? "ACTIVE" },
  });

  const onSubmit = async (values) => {
    try {
      await mutation.mutateAsync({ id: user.id, payload: isSelf ? { name: values.name } : { name: values.name, status: values.status, ...(canChangeRole && { role: values.role }) } });
      setOpen(false);
    } catch {
      // Error state is rendered below.
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="w-full space-y-5" noValidate>
      <Input label="نام کاربر" required error={errors.name?.message} {...register("name")} />
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2"><label className="text-sm font-medium">نقش</label><select aria-label="نقش" disabled={!canChangeRole} className="h-11 w-full rounded-xl border border-Border bg-Surface px-3 outline-none focus:border-primary" {...register("role")}><option value="ADMIN">مدیر کل</option><option value="MANAGER">مدیر</option><option value="STAFF">کارمند</option></select></div>
        <div className="space-y-2"><label className="text-sm font-medium">وضعیت</label><select aria-label="وضعیت" disabled={isSelf} className="h-11 w-full rounded-xl border border-Border bg-Surface px-3 outline-none focus:border-primary" {...register("status")}><option value="ACTIVE">فعال</option><option value="INACTIVE">غیرفعال</option><option value="SUSPENDED">مسدود</option></select></div>
      </div>
      {mutation.isError && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">ویرایش کاربر ناموفق بود.</p>}
      <div className="flex justify-end gap-2 border-t border-Border pt-4"><Button type="button" variant="secondary" onClick={() => setOpen(false)}>انصراف</Button><Button type="submit" loading={mutation.isPending}>ذخیره تغییرات</Button></div>
    </form>
  );
}
