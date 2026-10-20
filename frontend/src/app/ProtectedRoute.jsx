import { Navigate, useLocation } from "react-router";
import { Spinner } from "../components/ui";
import useAuth from "../layouts/TopBar/Auth/context/useAuth";

function ProtectedRoute({ children }) {
  const { isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  // تا زمانی که مشخص نشده کاربر وارد شده یا نه (بازیابی نشست از کوکی در حال انجام
  // است)، به‌جای پرش لحظه‌ای به صفحه ورود، یک حالت بارگذاری ساده نشان می‌دهیم.
  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-Background">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  return children;
}

export default ProtectedRoute;
