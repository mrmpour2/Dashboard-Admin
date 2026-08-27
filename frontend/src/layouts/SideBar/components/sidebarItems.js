import {
  LayoutDashboard,
  Package,
  Users,
  Ticket,
  MessageSquare,
} from "lucide-react";

export const sidebarItems = [
  {
    title: "داشبورد",
    path: "/",
    icon: LayoutDashboard,
  },
  {
    title: "محصولات",
    path: "/products",
    icon: Package,
  },
  {
    title: "کاربران",
    path: "/users",
    icon: Users,
  },
  {
    title: "تیکت ها",
    path: "/tickets",
    icon: Ticket,
  },
  {
    title: "نظرات",
    path: "/comments",
    icon: MessageSquare,
  },
];
