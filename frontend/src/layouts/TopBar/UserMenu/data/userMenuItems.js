import {
  UserRound,
  Settings,
  ShieldCheck,
  Moon,
  LogOut,
  Heart,
} from "lucide-react";

const userMenuItems = [
  {
    id: 1,
    title: "پروفایل",
    description: "اطلاعات شخصی،عکس پروفایل،ایمیل",
    bgColor: "bg-purple-100",
    path: "/profile",
    icon: UserRound,
    type: "link",
  },
  {
    id: 2,
    title: "تنظیمات",
    description: "زبان،اعلان ها ، تاریخ",
    bgColor: "bg-emerald-100",
    path: "/settings",
    icon: Settings,
    type: "link",
  },
  {
    id: 3,
    title: "امنیت",
    description: "تغییر رمز، ورود دو مرحله ای ",
    bgColor: "bg-cyan-100",
    path: "/security",
    icon: ShieldCheck,
    type: "link",
  },
  {
    id: 4,
    title: "علاقه‌مندی‌ها",
    description: "محصولات ذخیره‌شده ، تیکت های  و آیتم های مورد علاقه",
    bgColor: "bg-rose-100",
    icon: Heart,
    type: "link",
  },
  {
    id: 5,
    title: "تغییر تم",
    icon: Moon,
    type: "action",
    action: "toggel-theme",
  },
];

export default userMenuItems;
