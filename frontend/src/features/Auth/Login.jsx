import { useState } from "react";
import { Navigate, useLocation, useNavigate } from "react-router";
import { Eye, EyeOff, LockKeyhole, Mail, ShieldCheck } from "lucide-react";
import { Input, Button, Card } from "../../components/ui";
import { useAuth } from "../../auth/useAuth";

function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, login, isLoading, isLoggingIn, loginError } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [formError, setFormError] = useState("");

  if (!isLoading && user)
    return <Navigate to={location.state?.from || "/"} replace />;

  const submit = async (event) => {
    event.preventDefault();
    setFormError("");
    if (!email.trim() || !password) {
      setFormError("ایمیل و رمز عبور را وارد کنید.");
      return;
    }
    try {
      await login({ email: email.trim().toLowerCase(), password });
      navigate(location.state?.from || "/", { replace: true });
    } catch (error) {
      setFormError(
        error?.message || "ورود انجام نشد. اطلاعات حساب را بررسی کنید.",
      );
    }
  };

  return (
    <main
      dir="rtl"
      className="grid min-h-screen place-items-center bg-Background p-4 sm:p-6"
    >
      <div className="w-full max-w-md">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-4 grid size-14 place-items-center rounded-2xl bg-gradient-brand text-white shadow-Glow">
            <ShieldCheck size={28} aria-hidden="true" />
          </div>
          <h1 className="text-2xl font-bold text-textPrimary">
            ورود به سامانه
          </h1>
          <p className="mt-2 text-sm text-textSecondary">
            برای ورود به پنل مدیریت، اطلاعات حساب خود را وارد کنید.
          </p>
        </div>

        <Card className="p-5 sm:p-7">
          <form onSubmit={submit} className="space-y-5" noValidate>
            {(formError || loginError) && (
              <div
                role="alert"
                className="rounded-xl border border-Danger/30 bg-Danger/10 px-4 py-3 text-sm text-Danger"
              >
                {formError || loginError.message}
              </div>
            )}

            <Input
              label="ایمیل"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder=""
              autoComplete="username"
              icon={<Mail size={18} />}
              required
              dir="ltr"
            />

            <div className="relative items-center">
              <Input
                label="رمز عبور"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder=""
                autoComplete="current-password"
                icon={<LockKeyhole size={18} />}
                required
                dir="ltr"
              />
              <button
                type="button"
                onClick={() => setShowPassword((value) => !value)}
                aria-label={
                  showPassword ? "پنهان کردن رمز عبور" : "نمایش رمز عبور"
                }
                className="absolute  right-8 top-1.5 rounded-lg p-2 text-textMuted hover:bg-SurfaceMuted hover:text-textPrimary focus:outline-none focus:ring-2 focus:ring-primary/30"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>

            <Button type="submit" className="w-full" loading={isLoggingIn}>
              ورود به پنل
            </Button>
          </form>
        </Card>

        <p className="mt-5 text-center text-xs text-textSecondary">
          ورود فقط برای اعضای مجاز فروشگاه امکان‌پذیر است.
        </p>
      </div>
    </main>
  );
}

export default Login;
