import { NavLink } from "react-router";
import { sidebarItems } from "./sidebarItems";
function SidebarContent() {
  return (
    <nav className="flex flex-col items-start text-white gap-y-8.25  py-20 font-Vazir font-medium ">
      {sidebarItems.map((item) => {
        const Icon = item.icon;

        return (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              `flex items-center gap-x-5.5 rounded-lg px-8 py-2 cursor-pointer  hover:text-textColor text-xl ${isActive ? "text-primary bg-Surface" : "text-white"}`
            }
          >
            <Icon size={20} />
            <span>{item.title}</span>
          </NavLink>
        );
      })}
    </nav>
  );
}

export default SidebarContent;
