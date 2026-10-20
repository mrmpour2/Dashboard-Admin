import { createBrowserRouter } from "react-router";
import DashboardLayout from "../layouts/DashboardLayout";
import PageLoading from "./PageLoading";
import ProtectedRoute from "../auth/ProtectedRoute";
const page = (load) => async () => ({ Component: (await load()).default });

const Router = createBrowserRouter([
  { path: "/login", HydrateFallback: PageLoading, lazy: page(() => import("../features/Auth/Login")) },
  { path: "/forbidden", lazy: page(() => import("../features/NotFound/Forbidden")) },
  {
    element: <ProtectedRoute />,
    HydrateFallback: PageLoading,
    children: [
      {
        path: "/",
        element: <DashboardLayout />,
        children: [
          { index: true, lazy: page(() => import("../features/Home/Home")) },
          { path: "products", lazy: page(() => import("../features/Products/Products")) },
          {
            element: <ProtectedRoute roles={["ADMIN", "MANAGER"]} />,
            children: [
              { path: "users", lazy: page(() => import("../features/Users/Users")) },
              { path: "coupons", lazy: page(() => import("../features/Coupons/Coupons")) },
            ],
          },
          { path: "orders", lazy: page(() => import("../features/Orders/Orders")) },
          { path: "tickets", lazy: page(() => import("../features/Tickets/Tickets")) },
          { path: "tickets/:ticketID", lazy: page(() => import("../features/Tickets/TicketDetail")) },
          { path: "comments", lazy: page(() => import("../features/Comments/Comments")) },
          { path: "profile", lazy: page(() => import("../features/Profile/Profile")) },
          { path: "settings", lazy: page(() => import("../features/Settings/Settings")) },
          { path: "security", lazy: page(() => import("../features/Security/Security")) },
          { path: "*", lazy: page(() => import("../features/NotFound/NotFound")) },
        ],
      },
    ],
  },
]);

export default Router;
