import { LayoutDashboard, Package, Users, Ticket, MessageSquare, ShoppingBag, Tags } from "lucide-react";

export const sidebarItems = [
  { title: "داشبورد", path: "/", icon: LayoutDashboard },
  { title: "محصولات", path: "/products", icon: Package },
  { title: "سفارش‌ها", path: "/orders", icon: ShoppingBag },
  { title: "کدهای تخفیف", path: "/coupons", icon: Tags, roles: ["ADMIN", "MANAGER"] },
  { title: "کاربران", path: "/users", icon: Users, roles: ["ADMIN", "MANAGER"] },
  { title: "تیکت ها", path: "/tickets", icon: Ticket },
  { title: "نظرهای مشتریان", path: "/comments", icon: MessageSquare },
];
