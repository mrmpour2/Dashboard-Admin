import { useFieldArray, useForm, useWatch } from "react-hook-form";
import { Image as ImageIcon, Plus, Trash2, Upload } from "lucide-react";
import { useEffect, useState } from "react";
import { z } from "zod";
import { Button, Input } from "../../../components/ui";
import useModal from "../../../components/ui/Modal/context/useModal";
import { useCreateProduct, useUpdateProduct, useProducts } from "../../../hooks/api/useProducts";
import { useUploadProductImageMutation } from "../hooks/useProductsQuery";
import { normalizeProductVideoUrl } from "../../../utils/productVideo.js";
import { formatPrice } from "../../../utils/formatPrice.js";

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
  ingredients: z.string().trim().max(2000).optional(),
  ingredientItems: z.array(z.object({
    name: z.string().trim().min(1, "نام فارسی ماده الزامی است").max(120),
    nameEn: z.string().trim().max(120).optional(),
  })).max(30),
  customOptions: z.array(z.object({
    label: z.string().trim().min(1, "نام فارسی گزینه الزامی است").max(120),
    labelEn: z.string().trim().max(120).optional(),
    priceDelta: z.coerce.number().finite().min(0, "مبلغ اضافه نمی‌تواند منفی باشد"),
    isActive: z.boolean(),
  })).max(12),
  editorialScore: z.union([z.literal(""), z.coerce.number().int().min(1).max(10)]).optional().transform((value) => value === "" ? null : value),
  allergenInfo: z.string().trim().max(1000).optional(),
  purchaseConditions: z.string().trim().max(1000).optional(),
  price: z.coerce.number().positive("قیمت باید بیشتر از صفر باشد"),
  stock: z.coerce.number().int().min(0, "موجودی نمی‌تواند منفی باشد"),
  category: z.string().trim().max(100).optional(),
  imageUrl: z.string().url("آدرس تصویر معتبر نیست").or(z.literal("")),
  videoUrl: z.string().refine((value) => normalizeProductVideoUrl(value) !== null, "فقط فایل مستقیم MP4/WebM/OGG یا لینک معتبر آپارات/یوتیوب پذیرفته می‌شود."),
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
  const [savedProductId, setSavedProductId] = useState(product?.id ?? null);
  const mutation = isEdit || savedProductId ? updateMutation : createMutation;
  const uploadImage = useUploadProductImageMutation();
  const [imageFile, setImageFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [imageError, setImageError] = useState("");

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
      ingredients: product?.ingredients ?? "",
      ingredientItems: (product?.ingredientItems ?? []).map((item) => ({ name: item.name ?? "", nameEn: item.nameEn ?? "" })),
      customOptions: (product?.customOptions ?? []).map((option) => ({
        label: option.label ?? "",
        labelEn: option.labelEn ?? "",
        priceDelta: option.priceDelta ?? 0,
        isActive: option.isActive !== false,
      })),
      editorialScore: product?.editorialScore ?? "",
      allergenInfo: product?.allergenInfo ?? "",
      purchaseConditions: product?.purchaseConditions ?? "",
      price: product?.price ?? "",
      stock: product?.stock ?? 0,
      category: product?.category ?? "",
      imageUrl: product?.imageUrl ?? "",
      videoUrl: product?.videoUrl ?? "",
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
  const { fields: ingredientFields, append: appendIngredient, remove: removeIngredient } = useFieldArray({ control, name: "ingredientItems" });
  const { fields: optionFields, append: appendOption, remove: removeOption } = useFieldArray({ control, name: "customOptions" });
  const imageUrl = useWatch({ control, name: "imageUrl" });

  useEffect(() => () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
  }, [previewUrl]);

  const onSubmit = async (values) => {
    // چک‌باکس‌های بدون انتخاب ممکن است `undefined` بدهند؛ سرور آرایه می‌خواهد.
    const payload = {
      ...values,
      addOnIds: Array.isArray(values.addOnIds) ? values.addOnIds : [],
      ingredientItems: values.ingredientItems.map((item, sortOrder) => ({ ...item, sortOrder })),
      customOptions: values.customOptions.map((option, sortOrder) => ({ ...option, sortOrder })),
      videoUrl: normalizeProductVideoUrl(values.videoUrl) ?? "",
    };
    try {
      const savedProduct = isEdit || savedProductId
        ? await updateMutation.mutateAsync({ id: product?.id ?? savedProductId, payload })
        : await createMutation.mutateAsync(payload);
      if (!isEdit && !savedProductId && savedProduct?.id) setSavedProductId(savedProduct.id);
      if (imageFile && savedProduct?.id) {
        await uploadImage.mutateAsync({ id: savedProduct.id, file: imageFile });
      }
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
      <div className="grid min-w-0 gap-4 sm:grid-cols-2">
        <Input label="امتیاز شیش برگر لاین (۱ تا ۱۰)" type="number" min="1" max="10" step="1" error={errors.editorialScore?.message} {...register("editorialScore")} />
      </div>
      <Input label="آدرس تصویر" type="url" error={errors.imageUrl?.message} {...register("imageUrl")} />
      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-Border p-3">
        <div className="flex size-20 items-center justify-center overflow-hidden rounded-lg bg-SurfaceMuted">
          {(previewUrl || imageUrl) ? <img src={previewUrl || imageUrl} alt={product?.name || "پیش‌نمایش محصول"} className="size-full object-cover" /> : <ImageIcon aria-hidden="true" />}
        </div>
        <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-Border px-3 py-2 text-sm">
          <Upload aria-hidden="true" className="size-4" /> انتخاب تصویر
          <input type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={(event) => {
            const file = event.target.files?.[0];
            event.target.value = "";
            if (!file) return;
            if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
              setImageError("فقط تصویر JPG، PNG یا WebP پذیرفته می‌شود.");
              return;
            }
            if (file.size > 5 * 1024 * 1024) {
              setImageError("حجم تصویر نباید بیشتر از ۵ مگابایت باشد.");
              return;
            }
            setImageError("");
            setImageFile(file);
            setPreviewUrl(URL.createObjectURL(file));
          }} />
        </label>
        <span className="text-xs text-textMuted">JPG، PNG یا WebP؛ حداکثر ۵ مگابایت</span>
        {imageError ? <p role="alert" className="w-full text-xs text-red-600">{imageError}</p> : null}
      </div>
      <Input label="آدرس ویدیوی محصول (اختیاری)" type="url" error={errors.videoUrl?.message} {...register("videoUrl")} />
      <div className="flex flex-col gap-2">
        <label className="text-sm font-medium text-textPrimary" htmlFor="product-description">توضیحات</label>
        <textarea id="product-description" rows="4" className="w-full rounded-xl border border-Border bg-transparent p-3 text-sm outline-none focus:border-primary" {...register("description")} />
        {errors.description && <p className="text-xs text-red-600">{errors.description.message}</p>}
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium text-textPrimary" htmlFor="product-ingredients">مواد تشکیل‌دهنده</label>
          <textarea id="product-ingredients" rows="3" className="w-full rounded-xl border border-Border bg-transparent p-3 text-sm outline-none focus:border-primary" {...register("ingredients")} />
        </div>
        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium text-textPrimary" htmlFor="product-allergens">حساسیت‌زاها</label>
          <textarea id="product-allergens" rows="3" className="w-full rounded-xl border border-Border bg-transparent p-3 text-sm outline-none focus:border-primary" {...register("allergenInfo")} />
        </div>
      </div>
      <fieldset className="min-w-0 space-y-3 rounded-xl border border-Border p-3">
        <legend className="px-1 text-sm font-medium text-textPrimary">مواد تشکیل‌دهنده برای فارسی و انگلیسی</legend>
        {ingredientFields.map((field, index) => (
          <div key={field.id} className="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] sm:items-end">
            <Input label={`نام فارسی ${index + 1}`} error={errors.ingredientItems?.[index]?.name?.message} {...register(`ingredientItems.${index}.name`)} />
            <Input label="نام انگلیسی" error={errors.ingredientItems?.[index]?.nameEn?.message} {...register(`ingredientItems.${index}.nameEn`)} />
            <Button type="button" variant="ghost" size="sm" aria-label={`حذف ماده ${index + 1}`} onClick={() => removeIngredient(index)} icon={<Trash2 className="size-4 text-red-600" />} />
          </div>
        ))}
        {errors.ingredientItems?.message ? <p className="text-xs text-red-600">{errors.ingredientItems.message}</p> : null}
        <Button type="button" variant="secondary" size="sm" icon={<Plus className="size-4" />} onClick={() => appendIngredient({ name: "", nameEn: "" })} disabled={ingredientFields.length >= 30}>افزودن ماده</Button>
      </fieldset>
      <fieldset className="min-w-0 space-y-3 rounded-xl border border-Border p-3">
        <legend className="px-1 text-sm font-medium text-textPrimary">گزینه‌های «به سلیقه خودت»</legend>
        {optionFields.map((field, index) => (
          <div key={field.id} className="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,.8fr)_auto_auto] sm:items-end">
            <Input label={`نام فارسی ${index + 1}`} error={errors.customOptions?.[index]?.label?.message} {...register(`customOptions.${index}.label`)} />
            <Input label="نام انگلیسی" error={errors.customOptions?.[index]?.labelEn?.message} {...register(`customOptions.${index}.labelEn`)} />
            <Input label="مبلغ اضافه (تومان)" type="number" min="0" step="1" error={errors.customOptions?.[index]?.priceDelta?.message} {...register(`customOptions.${index}.priceDelta`)} />
            <label className="flex min-h-10 items-center gap-2 text-xs text-textPrimary"><input type="checkbox" {...register(`customOptions.${index}.isActive`)} /> فعال</label>
            <Button type="button" variant="ghost" size="sm" aria-label={`حذف گزینه ${index + 1}`} onClick={() => removeOption(index)} icon={<Trash2 className="size-4 text-red-600" />} />
          </div>
        ))}
        {errors.customOptions?.message ? <p className="text-xs text-red-600">{errors.customOptions.message}</p> : null}
        <Button type="button" variant="secondary" size="sm" icon={<Plus className="size-4" />} onClick={() => appendOption({ label: "", labelEn: "", priceDelta: 0, isActive: true })} disabled={optionFields.length >= 12}>افزودن گزینه</Button>
      </fieldset>
      <div className="flex flex-col gap-2">
        <label className="text-sm font-medium text-textPrimary" htmlFor="product-purchase-conditions">شرایط خرید و آماده‌سازی</label>
        <textarea id="product-purchase-conditions" rows="2" className="w-full rounded-xl border border-Border bg-transparent p-3 text-sm outline-none focus:border-primary" {...register("purchaseConditions")} />
      </div>
      <fieldset className="space-y-3 rounded-xl border border-Border p-3">
        <legend className="px-1 text-sm font-medium text-textPrimary">سایزها (اختیاری)</legend>
        <p className="text-xs text-textMuted">
          برای پیتزا مثلاً «تک نفره»، «دو نفره» و «شش نفره» را با قیمت هر سایز اضافه کنید.
          اگر خالی بماند، محصول با همان «قیمت» بالای فرم فروخته می‌شود.
        </p>
        {fields.map((field, index) => (
          <div key={field.id} className="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-[minmax(0,1.2fr)_minmax(0,1.2fr)_minmax(0,.8fr)_auto] sm:items-end">
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
                  {formatPrice(candidate.price)}
                </span>
              </label>
            ))}
          </div>
        )}
        {errors.addOnIds?.message ? (
          <p className="text-xs text-red-600">{errors.addOnIds.message}</p>
        ) : null}
      </fieldset>

      {(mutation.isError || uploadImage.isError) && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{uploadImage.isError ? `خطای آپلود تصویر: ${uploadImage.error?.message || "دوباره تلاش کنید."}` : "ذخیره محصول ناموفق بود. دوباره تلاش کنید."}</p>}
      <div className="sticky bottom-0 flex justify-end gap-2 border-t border-Border bg-Surface py-3">
        <Button type="button" variant="secondary" onClick={() => setOpen(false)}>انصراف</Button>
        <Button type="submit" loading={mutation.isPending || uploadImage.isPending}>{isEdit ? "ذخیره تغییرات" : "افزودن محصول"}</Button>
      </div>
    </form>
  );
}
