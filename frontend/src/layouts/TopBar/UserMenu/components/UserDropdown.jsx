import UserMenuItem from "./UserMenuItem";
import useTheme from "../../../Theme/useTheme";
import { LogOut, Moon, Sun } from "lucide-react";

function UserDropdown({ userMenuData, user }) {
  const { isDark, toggleTheme } = useTheme();
  const links = userMenuData.filter((item) => item.type === "link");
  const logoutItem = userMenuData.find((item) => item.action === "logout");

  return (
    <div className="mt-1.5 w-80 h-auto  rounded-2xl border border-Border bg-Surface shadow-2xl overflow-y-auto p-3 max-h-[60vh] scrollbar-thin scrollbar-thumb-primary/30 scrollbar-track-transparent hover:scrollbar-thumb-primary/50">
      <header className="border-b border-Border bg-linear-to-r from-primary/10 to-transparent px-5 py-5">
        <div className="flex items-center gap-3">
          <div className="grid size-11 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
            <span className="text-sm font-bold">{user.name?.slice(0, 1)}</span>
          </div>
          <div className="min-w-0">
            <p className="truncate font-bold text-textPrimary">{user.name}</p>
            <p className="truncate text-xs text-textMuted" dir="ltr">
              {user.email}
            </p>
          </div>
        </div>
        <div className="mt-4 inline-flex rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
          {user.role}
        </div>
      </header>

      <main className="space-y-1 p-3 ">
        {links.map((item) => (
          <UserMenuItem key={item.id} item={item} />
        ))}

        <div className="flex items-center justify-between rounded-xl px-3 py-3 text-textSecondary">
          <div className="flex items-center gap-3">
            <span className="grid size-8 place-items-center rounded-lg bg-SurfaceMuted">
              {isDark ? <Moon size={17} /> : <Sun size={17} />}
            </span>
            <div>
              <p className="text-sm font-medium text-textPrimary">تغییر تم</p>
              <p className="text-xs text-textMuted">
                {isDark ? "حالت تاریک" : "حالت روشن"}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={toggleTheme}
            aria-label="تغییر حالت نمایش"
            aria-pressed={isDark}
            className="relative inline-flex h-7 w-12 shrink-0 cursor-pointer items-center rounded-full bg-primary/20 p-1 transition-colors focus:outline-none focus:ring-2 focus:ring-primary/30"
          >
            <span
              className={`absolute top-1/2 size-5 -translate-y-1/2 rounded-full bg-Surface shadow transition-all duration-300 ${
                isDark ? "inset-s-1" : "inset-s-6"
              }`}
            />
          </button>
        </div>
      </main>

      {logoutItem && (
        <footer className="border-t border-Border p-3">
          <button
            type="button"
            onClick={logoutItem.onClick}
            disabled={logoutItem.disabled}
            className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-right text-Danger transition hover:bg-Danger/10 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <span className="grid size-8 place-items-center rounded-lg bg-Danger/10">
              <LogOut size={17} />
            </span>
            <span>
              <span className="block text-sm font-medium">
                {logoutItem.disabled ? "در حال خروج..." : "خروج از حساب"}
              </span>
              <span className="block text-xs text-textMuted">
                پایان امن نشست کاربری
              </span>
            </span>
          </button>
        </footer>
      )}
    </div>
  );
}

export default UserDropdown;
