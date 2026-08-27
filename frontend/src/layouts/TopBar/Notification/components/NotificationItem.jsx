import { Ticket, User, MessageSquare, Package, X } from "lucide-react";
import { NavLink } from "react-router";

function NotificationItem({ item }) {
  const icons = {
    ticket: Ticket,
    user: User,
    comment: MessageSquare,
    product: Package,
  };

  const Icon = icons[item.type];

  return (
    <>
      <div className="px-5 py-4 hover:bg-blue-100/50 dark:hover:bg-amber-900/10 transition-all duration-200 cursor-pointer group/item border-r-2 border-r-blue-500 bg-white/30 dark:bg-amber-900/5">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-full bg-primary/10  dark:bg-blue-900/30 dark:text-white/80 flex items-center justify-center shrink-0">
            <Icon size={20} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-gray-800 dark:text-gray-300">
              {item.title}
            </p>
            {!item.isRead && (
              <span
                className="
                size-2
                rounded-full
                bg-blue-500
                "
              />
            )}
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 line-clamp-2">
              {item.message}
            </p>
            {/* Footer */}
            <div className="mt-2 flex items-center gap-2 text-xs">
              <span className="text-xs text-amber-600 dark:text-amber-400 font-medium">
                {item.time}
              </span>
              <span className="w-1 h-1 rounded-full bg-gray-300 dark:bg-gray-600"></span>
              <NavLink
                to={`/tickets/${item.id}`}
                className="text-xs text-gray-400 hover:text-amber-500 transition-colors"
              >
                مشاهده
              </NavLink>
            </div>
          </div>
          <button className="text-gray-300 hover:text-red-500 opacity-0 group-hover/item:opacity-100 transition-all duration-200">
            <X size={16} />
          </button>
        </div>
      </div>
    </>
  );
}

export default NotificationItem;
