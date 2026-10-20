import { useState } from "react";
import { useNavigate } from "react-router";
import { ShieldCheck, KeyRound } from "lucide-react";
import { Input, Button } from "../../components/ui";
import { useAuth } from "../../auth/useAuth";
import useToast from "../../components/ui/Toast/ToastContext/useToast";
import { changeMyPassword } from "../../services/api/usersApi";

function Security() {
  const { logout } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const validate = () => {
    const next = {};
    if (!currentPassword) next.currentPassword = "رمز عبور فعلی الزامی است";
    if (newPassword.length < 8) {
      next.newPassword = "رمز عبور جدید باید حداقل ۸ کاراکتر باشد";
    } else if (!/[a-zA-Z]/.test(newPassword) || !/[0-9]/.test(newPassword)) {
      next.newPassword = "رمز عبور جدید باید ترکیبی از حرف و عدد باشد";
    } else if (newPassword === currentPassword) {
      next.newPassword = "رمز عبور جدید نمی‌تواند با رمز فعلی یکسان باشد";
    }
    if (confirmPassword !== newPassword) {
      next.confirmPassword = "تکرار رمز عبور مطابقت ندارد";
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!validate()) return;

    setIsSubmitting(true);
    try {
      await changeMyPassword({ currentPassword, newPassword });
      toast.Success("رمز عبور با موفقیت تغییر کرد. لطفاً دوباره وارد شوید.");
      // تغییر رمز عبور تمام نشست‌ها (از جمله همین نشست) را در سرور باطل کرده،
      // پس وضعیت محلی هم پاک و کاربر به صفحه ورود هدایت می‌شود.
      await logout();
      navigate("/login", { replace: true });
    } catch (error) {
      if (error?.response?.data?.code === "UNAUTHORIZED") {
        setErrors({ currentPassword: "رمز عبور فعلی اشتباه است" });
      } else {
        toast.Error(error?.message || "تغییر رمز عبور با خطا مواجه شد");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl p-4">
      <h1 className="mb-4 text-2xl font-bold text-textPrimary">امنیت</h1>

      <form
        onSubmit={handleSubmit}
        noValidate
        className="flex flex-col gap-4 rounded-2xl border border-Border bg-Surface p-6"
      >
        <div className="mb-2 flex items-center gap-2 text-textPrimary">
          <ShieldCheck size={20} className="text-primary" />
          <h2 className="font-bold">تغییر رمز عبور</h2>
        </div>

        <Input
          type="password"
          label="رمز عبور فعلی"
          required
          icon={<KeyRound size={18} />}
          autoComplete="current-password"
          value={currentPassword}
          onChange={(e) => setCurrentPassword(e.target.value)}
          error={errors.currentPassword}
        />
        <Input
          type="password"
          label="رمز عبور جدید"
          required
          icon={<KeyRound size={18} />}
          autoComplete="new-password"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          error={errors.newPassword}
          helperText={!errors.newPassword ? "حداقل ۸ کاراکتر، ترکیبی از حرف و عدد" : undefined}
        />
        <Input
          type="password"
          label="تکرار رمز عبور جدید"
          required
          icon={<KeyRound size={18} />}
          autoComplete="new-password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          error={errors.confirmPassword}
        />

        <div className="flex justify-end">
          <Button type="submit" variant="primary" loading={isSubmitting}>
            تغییر رمز عبور
          </Button>
        </div>
      </form>
    </div>
  );
}

export default Security;
