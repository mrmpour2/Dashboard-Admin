import { LayoutDashboard, Package, Users, Ticket, MessageSquare, ShoppingBag, Tags, CircleHelp, Settings } from "lucide-react";

export const sidebarItems = [
  { title: "داشبورد", path: "/", icon: LayoutDashboard },
  { title: "محصولات", path: "/products", icon: Package },
  { title: "سفارش‌ها", path: "/orders", icon: ShoppingBag },
  { title: "کدهای تخفیف", path: "/coupons", icon: Tags, roles: ["ADMIN", "MANAGER"] },
  { title: "کاربران", path: "/users", icon: Users, roles: ["ADMIN", "MANAGER"] },
  { title: "پرسش‌های متداول", path: "/faqs", icon: CircleHelp, roles: ["ADMIN", "MANAGER"] },
  { title: "تیکت ها", path: "/tickets", icon: Ticket },
  { title: "نظرهای مشتریان", path: "/comments", icon: MessageSquare },
  { title: "تنظیمات", path: "/settings", icon: Settings },
];
