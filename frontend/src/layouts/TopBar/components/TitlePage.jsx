import { useLocation } from "react-router";

function TitlePage() {
  const location = useLocation();

  const titles = {
    "/": "داشبورد",
    "/products": "محصولات",
    "/users": "کاربران",
    "/comments": "نظرات",
    "/tickets": "تیکت‌ها",
  };

  const title = titles[location.pathname] || "داشبورد";

  return (
    <h2 className="flex w-20 font-bold font-Vazir text-3xl text-textColor">
      {title}
    </h2>
  );
}

export default TitlePage;
