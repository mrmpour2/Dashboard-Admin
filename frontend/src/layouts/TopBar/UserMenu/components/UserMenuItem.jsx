import { ChevronLeft } from "lucide-react";
import { NavLink } from "react-router";
import { Dropdown } from "../../../../components/ui";
function UserMenuItem({ item }) {
  const Icon = item.icon;
  return (
    <div>
      {item.type === "link" && (
        <NavLink
          to={item.path}
          className="flex justify-between items-center gap-x-3 px-3 py-2.5 rounded-xl text-gray-700 dark:text-gray-300 hover:bg-amber-50 dark:hover:bg-amber-900/20 transition-all duration-200 group/item grow"
        >
          <div
            className={`${item.bgColor} w-8 h-8 rounded-lg  dark:bg-blue-900/30 flex items-center justify-center`}
          >
            <div className="w-4 h-4 text-textColor dark:text-white">
              <Icon size={18} />
            </div>
          </div>
          <div className="flex flex-col text-right grow ">
            <span className="text-sm font-medium">{item.title}</span>
            <p className="text-xs text-gray-400 max-w-40 truncate">
              {item.description}
            </p>
          </div>
          <div className="w-4 h-4 text-gray-300 group-hover/item:text-amber-500 transition-colors">
            <ChevronLeft size={18} />
          </div>
        </NavLink>
      )}
    </div>
  );
}

export default UserMenuItem;
