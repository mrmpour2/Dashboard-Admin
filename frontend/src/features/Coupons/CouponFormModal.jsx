import { useState } from "react";
import { Plus, Pencil } from "lucide-react";
import { Modal, Input, Button } from "../../components/ui";
import useModal from "../../components/ui/Modal/context/useModal";
import useToast from "../../components/ui/Toast/ToastContext/useToast";
import { useCreateCouponMutation, useUpdateCouponMutation } from "./hooks/useCouponsQuery";
import { discountTypeLabels } from "../../utils/enumLabels";

const emptyForm = {
  code: "",
  discountType: "PERCENTAGE",
  discountValue: "",
  minOrderAmount: "",
  maxUses: "",
  isActive: true,
};

const discountTypeOptions = Object.entries(discountTypeLabels);

// ورودی تاریخ HTML به‌شکل yyyy-MM-dd است؛ برای نمایش مقدار اولیه یک تاریخ ISO
// موجود (هنگام ویرایش) باید فقط بخش تاریخ آن جدا شود.
function toDateInputValue(isoString) {
  if (!isoString) return "";
  return new Date(isoString).toISOString().slice(0, 10);
}

function CouponForm({ coupon, onDone }) {
  const isEditMode = Boolean(coupon);
  const { setOpen } = useModal();
  const { toast } = useToast();
  const createCoupon = useCreateCouponMutation();
  const updateCoupon = useUpdateCouponMutation();

  const [form, setForm] = useState(() =>
    isEditMode
      ? {
          code: coupon.code,
          discountType: coupon.discountType,
          discountValue: String(coupon.discountValue),
          minOrderAmount: coupon.minOrderAmount ? String(coupon.minOrderAmount) : "",
          maxUses: coupon.maxUses ? String(coupon.maxUses) : "",
          isActive: coupon.isActive,
          expiresAt: toDateInputValue(coupon.expiresAt),
        }
      : emptyForm,
  );
  const [errors, setErrors] = useState({});

  const isPending = createCoupon.isPending || updateCoupon.isPending;

  const validate = () => {
    const next = {};
    if (!form.code.trim() || form.code.trim().length < 3) {
      next.code = "کد تخفیف باید حداقل ۳ کاراکتر باشد";
    } else if (!/^[a-zA-Z0-9_-]+$/.test(form.code.trim())) {
      next.code = "فقط حروف انگلیسی، عدد، خط تیره و زیرخط مجاز است";
    }
    const value = Number(form.discountValue);
    if (!form.discountValue || Number.isNaN(value) || value <= 0) {
      next.discountValue = "مقدار تخفیف باید عددی مثبت باشد";
    } else if (form.discountType === "PERCENTAGE" && value > 100) {
      next.discountValue = "درصد تخفیف نمی‌تواند بیشتر از ۱۰۰ باشد";
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!validate()) return;

    const payload = {
      code: form.code.trim().toUpperCase(),
      discountType: form.discountType,
      discountValue: Number(form.discountValue),
      isActive: form.isActive,
      minOrderAmount: form.minOrderAmount ? Number(form.minOrderAmount) : null,
      maxUses: form.maxUses ? Number(form.maxUses) : null,
      expiresAt: form.expiresAt ? new Date(form.expiresAt).toISOString() : null,
    };

    try {
      if (isEditMode) {
        await updateCoupon.mutateAsync({ id: coupon.id, payload });
        toast.Success("کد تخفیف با موفقیت به‌روزرسانی شد");
      } else {
        await createCoupon.mutateAsync(payload);
        toast.Success("کد تخفیف جدید با موفقیت ثبت شد");
      }
      setOpen(false);
      onDone?.();
    } catch (error) {
      toast.Error(error?.message || "ثبت کد تخفیف با خطا مواجه شد");
    }
  };

  return (
    <form onSubmit={handleSubmit} noValidate>
      <Modal.Content.Body className="w-full items-stretch gap-4">
        <Input
          label="کد تخفیف"
          required
          placeholder="SUMMER10"
          value={form.code}
          onChange={(e) => setForm({ ...form, code: e.target.value })}
          error={errors.code}
          helperText={!errors.code ? "فقط حروف انگلیسی و عدد — خودکار بزرگ می‌شود" : undefined}
        />

        <div className="flex flex-col gap-1.5 text-start">
          <label className="text-sm font-medium text-textSecondary">نوع تخفیف</label>
          <div className="flex gap-2">
            {discountTypeOptions.map(([value, label]) => (
              <button
                key={value}
                type="button"
                onClick={() => setForm({ ...form, discountType: value })}
                className={`flex-1 rounded-Button px-3 py-2 text-sm transition-colors ${
                  form.discountType === value
                    ? "bg-primary text-white"
                    : "bg-SurfaceMuted text-textSecondary hover:bg-Border"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <Input
          label={form.discountType === "PERCENTAGE" ? "درصد تخفیف" : "مبلغ تخفیف (تومان)"}
          type="number"
          required
          value={form.discountValue}
          onChange={(e) => setForm({ ...form, discountValue: e.target.value })}
          error={errors.discountValue}
        />

        <div className="grid grid-cols-2 gap-3">
          <Input
            label="حداقل مبلغ سفارش (اختیاری)"
            type="number"
            value={form.minOrderAmount}
            onChange={(e) => setForm({ ...form, minOrderAmount: e.target.value })}
          />
          <Input
            label="سقف تعداد استفاده (اختیاری)"
            type="number"
            value={form.maxUses}
            onChange={(e) => setForm({ ...form, maxUses: e.target.value })}
          />
        </div>

        <Input
          label="تاریخ انقضا (اختیاری)"
          type="date"
          value={form.expiresAt || ""}
          onChange={(e) => setForm({ ...form, expiresAt: e.target.value })}
        />

        <label className="flex cursor-pointer items-center gap-2 text-sm text-textSecondary">
          <input
            type="checkbox"
            checked={form.isActive}
            onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
            className="size-4 rounded border-Border accent-primary"
          />
          فعال باشد
        </label>
      </Modal.Content.Body>
      <Modal.Content.Footer className="justify-end gap-2 px-4 pb-4">
        <Button type="button" variant="secondary" size="sm" onClick={() => setOpen(false)}>
          انصراف
        </Button>
        <Button type="submit" variant="primary" size="sm" loading={isPending}>
          {isEditMode ? "ذخیره تغییرات" : "افزودن کد تخفیف"}
        </Button>
      </Modal.Content.Footer>
    </form>
  );
}

function CouponFormModal({ coupon, onDone }) {
  const isEditMode = Boolean(coupon);

  return (
    <Modal>
      <Modal.Trigger
        aria-label={isEditMode ? "ویرایش کد تخفیف" : "افزودن کد تخفیف"}
        className={
          isEditMode
            ? "flex size-8 items-center justify-center rounded-lg text-textSecondary transition-colors hover:bg-SurfaceMuted hover:text-primary"
            : "inline-flex items-center gap-2 rounded-Button bg-gradient-brand px-4 py-2.5 text-sm font-bold text-white shadow-Glow transition-smooth hover:brightness-110"
        }
      >
        {isEditMode ? <Pencil size={16} /> : <Plus size={16} />}
        {!isEditMode && "افزودن کد تخفیف"}
      </Modal.Trigger>
      <Modal.Content>
        <Modal.Content.Header>
          {isEditMode ? "ویرایش کد تخفیف" : "افزودن کد تخفیف جدید"}
        </Modal.Content.Header>
        <CouponForm coupon={coupon} onDone={onDone} />
      </Modal.Content>
    </Modal>
  );
}

export default CouponFormModal;
