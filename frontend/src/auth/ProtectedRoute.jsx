import { Navigate, Outlet, useLocation } from "react-router";
import { useAuth } from "./useAuth";

function ProtectedRoute({ roles }) {
  const { user, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <main className="grid min-h-screen place-items-center bg-Background p-6">
        <div role="status" className="rounded-2xl border border-Border bg-Surface px-6 py-5 text-sm text-textSecondary shadow-Card">
          در حال بررسی نشست کاربری...
        </div>
      </main>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />;
  }

  if (roles?.length && !roles.includes(user.role)) {
    return <Navigate to="/forbidden" replace />;
  }

  return <Outlet />;
}

export default ProtectedRoute;
