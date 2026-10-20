import { useMemo, useState } from "react";
import { Plus, Trash2, ShoppingCart, BadgePercent } from "lucide-react";
import { Modal, Button, Input } from "../../components/ui";
import useModal from "../../components/ui/Modal/context/useModal";
import useToast from "../../components/ui/Toast/ToastContext/useToast";
import { useUsersQuery } from "../Users/hooks/useUsersQuery";
import { useProductsQuery } from "../Products/hooks/useProductsQuery";
import { useCreateOrderMutation } from "./hooks/useOrdersQuery";

const currencyFormatter = new Intl.NumberFormat("fa-IR");
const emptyLine = () => ({ productId: "", quantity: 1 });

function OrderForm() {
  const { setOpen } = useModal();
  const { toast } = useToast();
  const createOrder = useCreateOrderMutation();

  const { data: usersData, isLoading: usersLoading } = useUsersQuery({ pageSize: 100 });
  const { data: productsData, isLoading: productsLoading } = useProductsQuery({ pageSize: 100 });
  const users = usersData?.items || [];
  const products = useMemo(() => productsData?.items || [], [productsData]);
  const productMap = useMemo(() => new Map(products.map((p) => [p.id, p])), [products]);

  const [customerId, setCustomerId] = useState("");
  const [lines, setLines] = useState([emptyLine()]);
  const [couponCode, setCouponCode] = useState("");
  const [error, setError] = useState("");

  const total = lines.reduce((sum, line) => {
    const product = productMap.get(line.productId);
    return product ? sum + Number(product.price) * Number(line.quantity || 0) : sum;
  }, 0);

  const updateLine = (index, patch) => {
    setLines((prev) => prev.map((line, i) => (i === index ? { ...line, ...patch } : line)));
  };

  const addLine = () => setLines((prev) => [...prev, emptyLine()]);
  const removeLine = (index) => setLines((prev) => prev.filter((_, i) => i !== index));

  const validate = () => {
    if (!customerId) return "انتخاب مشتری الزامی است";
    if (lines.length === 0) return "حداقل یک قلم کالا لازم است";
    for (const line of lines) {
      if (!line.productId) return "همه ردیف‌ها باید محصول انتخاب‌شده داشته باشند";
      if (!line.quantity || Number(line.quantity) < 1) return "تعداد باید حداقل ۱ باشد";
    }
    return "";
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }
    setError("");

    try {
      const order = await createOrder.mutateAsync({
        customerId,
        ...(couponCode.trim() && { couponCode: couponCode.trim() }),
        items: lines.map((line) => ({
          productId: line.productId,
          quantity: Number(line.quantity),
        })),
      });
      if (order.discountAmount > 0) {
        toast.Success(
          `سفارش ثبت شد — ${currencyFormatter.format(order.discountAmount)} تومان تخفیف اعمال شد`,
        );
      } else {
        toast.Success("سفارش جدید با موفقیت ثبت شد");
      }
      setOpen(false);
    } catch (err) {
      toast.Error(err?.message || "ثبت سفارش با خطا مواجه شد");
    }
  };

  return (
    <form onSubmit={handleSubmit} noValidate>
      <Modal.Content.Body className="w-full items-stretch gap-4">
        <div className="flex flex-col gap-1.5 text-start">
          <label className="text-sm font-medium text-textSecondary">مشتری</label>
          <select
            value={customerId}
            onChange={(e) => setCustomerId(e.target.value)}
            disabled={usersLoading}
            className="h-11 w-full rounded-Input border border-Border bg-Surface px-3 text-sm text-textPrimary outline-none focus:ring-2 focus:ring-primary/40"
          >
            <option value="">انتخاب کنید...</option>
            {users.map((user) => (
              <option key={user.id} value={user.id}>
                {user.name} ({user.email})
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-2 text-start">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium text-textSecondary">اقلام سفارش</label>
            <button
              type="button"
              onClick={addLine}
              className="flex items-center gap-1 text-xs font-medium text-primary hover:underline"
            >
              <Plus size={13} />
              افزودن ردیف
            </button>
          </div>

          {lines.map((line, index) => (
            <div key={index} className="flex items-center gap-2">
              <select
                value={line.productId}
                onChange={(e) => updateLine(index, { productId: e.target.value })}
                disabled={productsLoading}
                className="h-10 flex-1 rounded-Input border border-Border bg-Surface px-2.5 text-sm text-textPrimary outline-none focus:ring-2 focus:ring-primary/40"
              >
                <option value="">انتخاب محصول...</option>
                {products.map((product) => (
                  <option key={product.id} value={product.id}>
                    {product.name} — {currencyFormatter.format(product.price)} ت
                  </option>
                ))}
              </select>
              <input
                type="number"
                min={1}
                value={line.quantity}
                onChange={(e) => updateLine(index, { quantity: e.target.value })}
                className="h-10 w-20 rounded-Input border border-Border bg-Surface px-2 text-center text-sm text-textPrimary outline-none focus:ring-2 focus:ring-primary/40"
              />
              {lines.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeLine(index)}
                  aria-label="حذف ردیف"
                  className="flex size-9 shrink-0 items-center justify-center rounded-lg text-Danger hover:bg-Danger/10"
                >
                  <Trash2 size={15} />
                </button>
              )}
            </div>
          ))}
        </div>

        <div className="flex items-center justify-between rounded-xl bg-SurfaceMuted px-4 py-3">
          <span className="text-sm text-textSecondary">مبلغ کل (تخمینی، پیش از تخفیف)</span>
          <span className="font-Outfit font-bold text-textPrimary">
            {currencyFormatter.format(total)} تومان
          </span>
        </div>

        <Input
          label="کد تخفیف (اختیاری)"
          placeholder="SUMMER10"
          icon={<BadgePercent size={18} />}
          value={couponCode}
          onChange={(e) => setCouponCode(e.target.value)}
          helperText="اعتبار کد هنگام ثبت نهایی سفارش بررسی می‌شود"
        />

        {error && <p className="text-sm text-Danger">{error}</p>}
      </Modal.Content.Body>
      <Modal.Content.Footer className="justify-end gap-2 px-4 pb-4">
        <Button type="button" variant="secondary" size="sm" onClick={() => setOpen(false)}>
          انصراف
        </Button>
        <Button type="submit" variant="primary" size="sm" loading={createOrder.isPending}>
          ثبت سفارش
        </Button>
      </Modal.Content.Footer>
    </form>
  );
}

function CreateOrderModal() {
  return (
    <Modal>
      <Modal.Trigger className="inline-flex items-center gap-2 rounded-Button bg-gradient-brand px-4 py-2.5 text-sm font-bold text-white shadow-Glow transition-smooth hover:brightness-110">
        <ShoppingCart size={16} />
        سفارش جدید
      </Modal.Trigger>
      <Modal.Content>
        <Modal.Content.Header>ثبت سفارش جدید</Modal.Content.Header>
        <OrderForm />
      </Modal.Content>
    </Modal>
  );
}

export default CreateOrderModal;
