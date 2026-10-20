import { useLocation } from "react-router";

function TitlePage() {
  const location = useLocation();

  const titles = {
    "/": "داشبورد",
    "/products": "محصولات",
    "/users": "کاربران",
    "/comments": "نظرات",
    "/tickets": "تیکت‌ها",
    "/orders": "سفارش‌ها",
    "/coupons": "کدهای تخفیف",
    "/profile": "پروفایل",
    "/settings": "تنظیمات",
    "/security": "امنیت",
  };

  const title = titles[location.pathname] || "داشبورد";

  return (
    <h2 className="whitespace-nowrap font-Vazir text-base font-bold text-textPrimary sm:text-lg">
      {title}
    </h2>
  );
}

export default TitlePage;
