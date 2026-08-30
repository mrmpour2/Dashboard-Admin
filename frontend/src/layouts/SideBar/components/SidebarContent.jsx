import { NavLink } from "react-router";
import { sidebarItems } from "./sidebarItems";

function SidebarContent() {
  return (
    <nav className="flex flex-col gap-y-1.5 py-2 font-Vazir font-medium">
      {sidebarItems.map((item, index) => {
        const Icon = item.icon;

        return (
          <NavLink
            key={item.path}
            to={item.path}
            end={item.path === "/"}
            style={{ animationDelay: `${index * 60}ms` }}
            className={({ isActive }) =>
              `animate-fade-in-up group relative flex items-center gap-x-4 rounded-xl px-4 py-2.5 text-[15px] transition-all duration-300 ease-out ${
                isActive
                  ? "bg-white text-primary shadow-lg"
                  : "text-white/75 hover:bg-white/10 hover:text-white"
              }`
            }
          >
            <Icon
              size={19}
              className="shrink-0 transition-transform duration-300 group-hover:scale-110"
            />
            <span>{item.title}</span>
          </NavLink>
        );
      })}
    </nav>
  );
}

export default SidebarContent;
