import { createBrowserRouter, Outlet } from "react-router";
import Home from "../features/Home/Home";
import Products from "./../features/Products/Products";
import Users from "./../features/Users/Users";
import Tickets from "./../features/Tickets/Tickets";
import TicketDetail from "./../features/Tickets/TicketDetail";
import Comments from "./../features/Comments/Comments";
import NotFound from "../features/NotFound/NotFound";
import DashboardLayout from "../layouts/DashboardLayout";

const Router = createBrowserRouter([
  {
    path: "/",
    element: <DashboardLayout />,
    children: [
      {
        index: true,
        element: <Home />,
      },
      {
        path: "products",
        element: <Products />,
      },
      {
        path: "users",
        element: <Users />,
      },
      {
        path: "tickets",
        element: <Tickets />,
      },
      {
        path: "tickets/:ticketID",
        element: <TicketDetail />,
      },
      {
        path: "comments",
        element: <Comments />,
      },
      {
        path: "*",
        element: <NotFound />,
      },
    ],
  },
]);

export default Router;
