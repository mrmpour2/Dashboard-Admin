import { useEffect, useRef, useState } from "react";
import { Plus, Pencil, Image as ImageIcon, Upload } from "lucide-react";
import { Modal, Input, Button, Spinner } from "../../components/ui";
import useModal from "../../components/ui/Modal/context/useModal";
import useToast from "../../components/ui/Toast/ToastContext/useToast";
import {
  useCreateProductMutation,
  useUpdateProductMutation,
  useUploadProductImageMutation,
} from "./hooks/useProductsQuery";

const emptyForm = { name: "", description: "", price: "", stock: "", category: "" };
const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // باید با محدودیت سمت بک‌اند (backend/src/middleware/upload.js) هماهنگ بماند
const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];

function ProductImageUploader({ product }) {
  const { toast } = useToast();
  const uploadImage = useUploadProductImageMutation();
  const fileInputRef = useRef(null);
  const [previewUrl, setPreviewUrl] = useState(null);

  // در زمان unmount شدن کامپوننت، هر blob URL باقی‌مانده آزاد می‌شود
  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleFileChange = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = ""; // تا انتخاب دوباره همان فایل هم onChange را فعال کند
    if (!file) return;

    if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
      toast.Error("فقط فایل‌های تصویری (jpg, png, webp, gif) مجاز هستند");
      return;
    }
    if (file.size > MAX_IMAGE_SIZE) {
      toast.Error("حجم فایل نباید بیشتر از ۵ مگابایت باشد");
      return;
    }

    // پیش‌نمایش فوری از خود فایل انتخاب‌شده، پیش از تمام‌شدن آپلود.
    // این blob URL عمداً بلافاصله بعد از آپلود آزاد (revoke) نمی‌شود، چون
    // داده تازه از سرور (از طریق invalidate شدن کوئری) با کمی تأخیر می‌رسد؛
    // آزادسازی زودهنگام باعث می‌شد عکس برای یک لحظه بشکند.
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    const localPreview = URL.createObjectURL(file);
    setPreviewUrl(localPreview);

    try {
      await uploadImage.mutateAsync({ id: product.id, file });
      toast.Success("عکس محصول با موفقیت به‌روزرسانی شد");
    } catch (error) {
      toast.Error(error?.message || "آپلود عکس با خطا مواجه شد");
      URL.revokeObjectURL(localPreview);
      setPreviewUrl(null);
    }
  };

  const displayImage = previewUrl || product.imageUrl;

  return (
    <div className="flex items-center gap-4">
      <div className="flex size-20 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-Border bg-SurfaceMuted">
        {uploadImage.isPending ? (
          <Spinner size="md" />
        ) : displayImage ? (
          <img src={displayImage} alt={product.name} className="size-full object-cover" />
        ) : (
          <ImageIcon size={24} className="text-textMuted" />
        )}
      </div>
      <div className="flex flex-col items-start gap-1.5">
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploadImage.isPending}
        >
          <Upload size={14} />
          {product.imageUrl ? "تغییر عکس" : "افزودن عکس"}
        </Button>
        <span className="text-xs text-textMuted">jpg, png, webp یا gif — حداکثر ۵ مگابایت</span>
      </div>
      <input
        ref={fileInputRef}
        type="file"
        accept={ALLOWED_IMAGE_TYPES.join(",")}
        onChange={handleFileChange}
        className="hidden"
      />
    </div>
  );
}

function ProductForm({ product, onDone }) {
  const isEditMode = Boolean(product);
  const { setOpen } = useModal();
  const { toast } = useToast();
  const createProduct = useCreateProductMutation();
  const updateProduct = useUpdateProductMutation();

  const [form, setForm] = useState(() =>
    isEditMode
      ? {
          name: product.name,
          description: product.description || "",
          price: String(product.price),
          stock: String(product.stock),
          category: product.category || "",
        }
      : emptyForm,
  );
  const [errors, setErrors] = useState({});

  const isPending = createProduct.isPending || updateProduct.isPending;

  const validate = () => {
    const next = {};
    if (!form.name.trim() || form.name.trim().length < 2) {
      next.name = "نام محصول باید حداقل ۲ کاراکتر باشد";
    }
    const priceNum = Number(form.price);
    if (!form.price || Number.isNaN(priceNum) || priceNum <= 0) {
      next.price = "قیمت باید عددی مثبت باشد";
    }
    const stockNum = Number(form.stock);
    if (form.stock !== "" && (Number.isNaN(stockNum) || stockNum < 0)) {
      next.stock = "موجودی نمی‌تواند منفی باشد";
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!validate()) return;

    const payload = {
      name: form.name.trim(),
      description: form.description.trim() || undefined,
      price: Number(form.price),
      stock: form.stock === "" ? 0 : Number(form.stock),
      category: form.category.trim() || undefined,
    };

    try {
      if (isEditMode) {
        await updateProduct.mutateAsync({ id: product.id, payload });
        toast.Success("محصول با موفقیت به‌روزرسانی شد");
      } else {
        await createProduct.mutateAsync(payload);
        toast.Success("محصول جدید با موفقیت ثبت شد");
      }
      setOpen(false);
      onDone?.();
    } catch (error) {
      toast.Error(error?.message || "ثبت محصول با خطا مواجه شد");
    }
  };

  return (
    <form onSubmit={handleSubmit} noValidate>
      <Modal.Content.Body className="w-full items-stretch gap-4">
        {isEditMode ? (
          <ProductImageUploader product={product} />
        ) : (
          <p className="rounded-xl bg-SurfaceMuted px-3 py-2 text-xs text-textMuted">
            بعد از ثبت محصول می‌توانید از طریق ویرایش، عکس آن را اضافه کنید.
          </p>
        )}
        <Input
          label="نام محصول"
          required
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          error={errors.name}
        />
        <Input
          label="دسته‌بندی"
          value={form.category}
          onChange={(e) => setForm({ ...form, category: e.target.value })}
        />
        <div className="grid w-full grid-cols-2 gap-3">
          <Input
            label="قیمت (تومان)"
            type="number"
            required
            value={form.price}
            onChange={(e) => setForm({ ...form, price: e.target.value })}
            error={errors.price}
          />
          <Input
            label="موجودی"
            type="number"
            value={form.stock}
            onChange={(e) => setForm({ ...form, stock: e.target.value })}
            error={errors.stock}
          />
        </div>
        <Input
          label="توضیحات (اختیاری)"
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
        />
      </Modal.Content.Body>
      <Modal.Content.Footer className="justify-end gap-2 px-4 pb-4">
        <Button type="button" variant="secondary" size="sm" onClick={() => setOpen(false)}>
          انصراف
        </Button>
        <Button type="submit" variant="primary" size="sm" loading={isPending}>
          {isEditMode ? "ذخیره تغییرات" : "افزودن محصول"}
        </Button>
      </Modal.Content.Footer>
    </form>
  );
}

function ProductFormModal({ product, onDone }) {
  const isEditMode = Boolean(product);

  return (
    <Modal>
      <Modal.Trigger
        aria-label={isEditMode ? "ویرایش محصول" : "افزودن محصول"}
        className={
          isEditMode
            ? "flex size-8 items-center justify-center rounded-lg text-textSecondary transition-colors hover:bg-SurfaceMuted hover:text-primary"
            : "inline-flex items-center gap-2 rounded-Button bg-gradient-brand px-4 py-2.5 text-sm font-bold text-white shadow-Glow transition-smooth hover:brightness-110"
        }
      >
        {isEditMode ? <Pencil size={16} /> : <Plus size={16} />}
        {!isEditMode && "افزودن محصول"}
      </Modal.Trigger>
      <Modal.Content>
        <Modal.Content.Header>
          {isEditMode ? "ویرایش محصول" : "افزودن محصول جدید"}
        </Modal.Content.Header>
        <ProductForm product={product} onDone={onDone} />
      </Modal.Content>
    </Modal>
  );
}

export default ProductFormModal;
