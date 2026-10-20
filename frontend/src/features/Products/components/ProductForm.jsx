import { useFieldArray, useForm } from "react-hook-form";
import { Plus, Trash2 } from "lucide-react";
import { z } from "zod";
import { Button, Input } from "../../../components/ui";
import useModal from "../../../components/ui/Modal/context/useModal";
import { useCreateProduct, useUpdateProduct, useProducts } from "../../../hooks/api/useProducts";

/**
 * یک سایز/واریانت محصول؛ مثل پیتزای تک‌نفره، دو نفره و شش‌نفره.
 * هر سایز قیمت مستقل دارد و سایت همان قیمت را در صفحه محصول نشان می‌دهد.
 */
const variantSchema = z.object({
  label: z.string().trim().min(1, "برچسب سایز الزامی است").max(100),
  labelEn: z.string().trim().max(100).optional(),
  price: z.coerce.number().positive("قیمت سایز باید بیشتر از صفر باشد"),
  isActive: z.boolean().optional(),
});

const schema = z.object({
  name: z.string().trim().min(2, "نام محصول حداقل ۲ کاراکتر باشد").max(200),
  description: z.string().trim().max(2000).optional(),
  price: z.coerce.number().positive("قیمت باید بیشتر از صفر باشد"),
  stock: z.coerce.number().int().min(0, "موجودی نمی‌تواند منفی باشد"),
  category: z.string().trim().max(100).optional(),
  imageUrl: z.string().url("آدرس تصویر معتبر نیست").or(z.literal("")),
  // سایزها اختیاری‌اند؛ خالی بودن یعنی محصول یک قیمت ثابت دارد.
  variants: z
    .array(variantSchema)
    .max(10, "حداکثر ۱۰ سایز برای هر محصول")
    .refine((items) => new Set(items.map((item) => item.label)).size === items.length, {
      message: "برچسب سایزها نباید تکراری باشد",
    }),
  // مخلفات پیشنهادی این غذا (نوشیدنی/ساید)؛ همان‌هایی که در سایت بعد از افزودن
  // غذا به سبد پیشنهاد می‌شوند. فهرست خالی یعنی هیچ پیشنهادی ندارد.
  addOnIds: z
    .array(z.string())
    .max(12, "حداکثر ۱۲ مخلفات برای هر محصول")
    .refine((ids) => new Set(ids).size === ids.length, { message: "مخلفات تکراری مجاز نیست" })
    .optional(),
});

/** خطاهای zod را به شکل تودرتوی مورد انتظار react-hook-form تبدیل می‌کند. */
function toFieldErrors(issues) {
  const errors = {};
  for (const issue of issues) {
    let target = errors;
    issue.path.forEach((segment, index) => {
      const key = String(segment);
      if (index === issue.path.length - 1) {
        target[key] = { type: "validation", message: issue.message };
        return;
      }
      target[key] ??= {};
      target = target[key];
    });
  }
  return errors;
}

export default function ProductForm({ product = null }) {
  const { setOpen } = useModal();
  const createMutation = useCreateProduct();
  const updateMutation = useUpdateProduct();
  const isEdit = Boolean(product);
  const mutation = isEdit ? updateMutation : createMutation;

  /**
   * فهرست محصولات برای انتخاب مخلفات. یک صفحه کافی است: منوی رستوران کوچک است
   * و سقف `pageSize` همان ۱۰۰ است.
   */
  const { data: productsData } = useProducts({ pageSize: 100 });
  const selectableAddOns = (productsData?.items ?? []).filter(
    (candidate) => candidate.id !== product?.id,
  );

  const { register, control, handleSubmit, formState: { errors } } = useForm({
    resolver: (values) => {
      const result = schema.safeParse(values);
      if (result.success) return { values: result.data, errors: {} };
      return { values: {}, errors: toFieldErrors(result.error.issues) };
    },
    defaultValues: {
      name: product?.name ?? product?.title ?? "",
      description: product?.description ?? "",
      price: product?.price ?? "",
      stock: product?.stock ?? 0,
      category: product?.category ?? "",
      imageUrl: product?.imageUrl ?? "",
      // سایزهای ذخیره‌شده محصول تا کاربر بتواند قیمت هر سایز را ویرایش کند.
      variants: (product?.variants ?? []).map((variant) => ({
        label: variant.label ?? "",
        labelEn: variant.labelEn ?? "",
        price: variant.price ?? "",
        isActive: variant.isActive !== false,
      })),
      // مخلفات فعلی؛ سرور آن‌ها را به شکل کارت محصول برمی‌گرداند.
      addOnIds: (product?.addOns ?? []).map((addOn) => addOn.id),
    },
  });

  const { fields, append, remove } = useFieldArray({ control, name: "variants" });

  const onSubmit = async (values) => {
    // چک‌باکس‌های بدون انتخاب ممکن است `undefined` بدهند؛ سرور آرایه می‌خواهد.
    const payload = {
      ...values,
      addOnIds: Array.isArray(values.addOnIds) ? values.addOnIds : [],
    };
    try {
      if (isEdit) await updateMutation.mutateAsync({ id: product.id, payload });
      else await createMutation.mutateAsync(payload);
      setOpen(false);
    } catch {
      // Mutation state is rendered below; no unhandled promise is left behind.
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="w-full space-y-5" noValidate>
      <div className="grid gap-4 sm:grid-cols-2">
        <Input label="نام محصول" required error={errors.name?.message} {...register("name")} />
        <Input label="دسته‌بندی" error={errors.category?.message} {...register("category")} />
        <Input label="قیمت (تومان)" type="number" min="0" step="1" required error={errors.price?.message} {...register("price")} />
        <Input label="موجودی" type="number" min="0" step="1" required error={errors.stock?.message} {...register("stock")} />
      </div>
      <Input label="آدرس تصویر" type="url" error={errors.imageUrl?.message} {...register("imageUrl")} />
      <div className="flex flex-col gap-2">
        <label className="text-sm font-medium text-textPrimary" htmlFor="product-description">توضیحات</label>
        <textarea id="product-description" rows="4" className="w-full rounded-xl border border-Border bg-transparent p-3 text-sm outline-none focus:border-primary" {...register("description")} />
        {errors.description && <p className="text-xs text-red-600">{errors.description.message}</p>}
      </div>
      <fieldset className="space-y-3 rounded-xl border border-Border p-3">
        <legend className="px-1 text-sm font-medium text-textPrimary">سایزها (اختیاری)</legend>
        <p className="text-xs text-textMuted">
          برای پیتزا مثلاً «تک نفره»، «دو نفره» و «شش نفره» را با قیمت هر سایز اضافه کنید.
          اگر خالی بماند، محصول با همان «قیمت» بالای فرم فروخته می‌شود.
        </p>
        {fields.map((field, index) => (
          <div key={field.id} className="grid gap-3 sm:grid-cols-[1.2fr_1.2fr_.8fr_auto] sm:items-end">
            <Input
              label={`برچسب سایز ${index + 1}`}
              error={errors.variants?.[index]?.label?.message}
              {...register(`variants.${index}.label`)}
            />
            <Input
              label="برچسب انگلیسی"
              error={errors.variants?.[index]?.labelEn?.message}
              {...register(`variants.${index}.labelEn`)}
            />
            <Input
              label="قیمت (تومان)"
              type="number"
              min="0"
              step="1"
              error={errors.variants?.[index]?.price?.message}
              {...register(`variants.${index}.price`)}
            />
            <Button
              type="button"
              variant="ghost"
              size="sm"
              aria-label={`حذف سایز ${index + 1}`}
              onClick={() => remove(index)}
              icon={<Trash2 className="size-4 text-red-600" />}
            />
          </div>
        ))}
        {errors.variants?.message && <p className="text-xs text-red-600">{errors.variants.message}</p>}
        <Button
          type="button"
          variant="secondary"
          size="sm"
          icon={<Plus className="size-4" />}
          onClick={() => append({ label: "", labelEn: "", price: "", isActive: true })}
          disabled={fields.length >= 10}
        >
          افزودن سایز
        </Button>
      </fieldset>

      <fieldset className="space-y-3 rounded-xl border border-Border p-3">
        <legend className="px-1 text-sm font-medium text-textPrimary">مخلفات پیشنهادی (اختیاری)</legend>
        <p className="text-xs text-textMuted">
          نوشیدنی، ساید یا سس‌هایی که در سایت بعد از افزودن این غذا به سبد پیشنهاد می‌شوند.
          مشتری می‌تواند هر تعداد از آن‌ها را اضافه کند یا بدون مخلفات ادامه دهد.
        </p>
        {selectableAddOns.length === 0 ? (
          <p className="text-xs text-textMuted">محصول دیگری برای انتخاب وجود ندارد.</p>
        ) : (
          <div className="grid max-h-56 gap-2 overflow-y-auto sm:grid-cols-2">
            {selectableAddOns.map((candidate) => (
              <label
                key={candidate.id}
                className="flex cursor-pointer items-center gap-2 rounded-lg border border-Border px-3 py-2 text-sm transition-colors hover:border-primary has-checked:border-primary has-checked:bg-SurfaceMuted"
              >
                <input
                  type="checkbox"
                  value={candidate.id}
                  className="size-4 accent-primary"
                  {...register("addOnIds")}
                />
                <span className="min-w-0 flex-1 truncate text-textPrimary">{candidate.title}</span>
                <span className="shrink-0 text-xs text-textMuted">
                  {Number(candidate.price || 0).toLocaleString("fa-IR")} تومان
                </span>
              </label>
            ))}
          </div>
        )}
        {errors.addOnIds?.message ? (
          <p className="text-xs text-red-600">{errors.addOnIds.message}</p>
        ) : null}
      </fieldset>

      {mutation.isError && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">ذخیره محصول ناموفق بود. دوباره تلاش کنید.</p>}
      <div className="flex justify-end gap-2 border-t border-Border pt-4">
        <Button type="button" variant="secondary" onClick={() => setOpen(false)}>انصراف</Button>
        <Button type="submit" loading={mutation.isPending}>{isEdit ? "ذخیره تغییرات" : "افزودن محصول"}</Button>
      </div>
    </form>
  );
}
