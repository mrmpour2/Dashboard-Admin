import { NavLink } from "react-router";
import { sidebarItems } from "./sidebarItems";
import { useAuth } from "../../../auth/useAuth";

function SidebarContent({ onNavigate }) {
  const { user } = useAuth();
  const visibleItems = sidebarItems.filter((item) => !item.roles || item.roles.includes(user?.role));

  return (
    <nav
      aria-label="ناوبری اصلی"
      className="flex flex-col gap-y-1.5 py-2 font-Vazir font-medium"
    >
      {visibleItems.map((item) => {
        const Icon = item.icon;

        return (
          <NavLink
            key={item.path}
            to={item.path}
            end={item.path === "/"}
            onClick={onNavigate}

            className={({ isActive }) =>
              `group relative flex items-center gap-x-3 rounded-lg px-4 py-3 text-sm transition-colors ${
                isActive
                  ? "bg-primary-50 text-primary font-bold"
                  : "text-textSecondary hover:bg-SurfaceMuted hover:text-textPrimary"
              }`
            }
          >
            <Icon aria-hidden="true" size={19} className="shrink-0 transition-transform duration-300 group-hover:scale-110" />
            <span>{item.title}</span>
          </NavLink>
        );
      })}
    </nav>
  );
}

export default SidebarContent;
