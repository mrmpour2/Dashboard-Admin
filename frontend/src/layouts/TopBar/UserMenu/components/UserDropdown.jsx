import { Dropdown } from "../../../../components/ui";
import UserMenuItem from "./UserMenuItem";
import useTheme from "../../../Theme/useTheme";
import {
  ChevronLeft,
  UserRound,
  Mail,
  Settings,
  Bookmark,
  X,
  Moon,
  Sun,
} from "lucide-react";

function UserDropdown({ userMenuData, user }) {
  const { isDark, toggleTheme } = useTheme();

  const Icon = user.icon;

  return (
    <div
      className="mt-1.5 w-80 bg-white/95 dark:bg-slate-900/95 
           backdrop-blur-xl
           rounded-2xl shadow-2xl 
           border border-white/20 dark:border-slate-700/50
           overflow-auto
          "
    >
      {/* <!-- هدر پروفایل ادمین --> */}
      <header className="relative px-5 pt-6 pb-4 bg-linear-to-r from-amber-500/10 to-transparent">
        <div className="items-center gap-4">
          {/* <!-- آواتار ادمین --> */}
          <div className="flex ">
            {/* <!-- نشان ادمین (کوچک) --> */}
            <div className="inline-flex items-center justify-between gap-1  bg-amber-500 rounded-full p-1.5 border-2 border-white dark:border-slate-900">
              <Icon size={15} color="#fff" />
              <span className="text-xs text-white  font-medium">
                {user.role}
              </span>
            </div>
          </div>

          {/* <!-- اطلاعات ادمین --> */}
          <div className="flex-1 ">
            <div className="flex items-center gap-1 mt-0.5"></div>
            <div className="flex items-center gap-1 mt-0.5">
              <div className="w-3 h-3 text-amber-500">
                <Mail size={12} />
              </div>
              <span className="text-xs text-gray-500 dark:text-gray-400">
                {user.email}
              </span>
            </div>
          </div>
        </div>

        {/* <!-- آمار مدیریتی (مناسب ادمین) --> */}
        <div className="grid grid-cols-3 gap-2 mt-4 pt-3 border-t border-gray-100 dark:border-slate-700/50">
          <div className="text-center">
            <p className="text-lg font-bold text-gray-800 dark:text-white">
              ۱,۲۴۷
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              کل کاربران
            </p>
          </div>
          <div className="text-center">
            <p className="text-lg font-bold text-gray-800 dark:text-white">۳</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              کل تیکت ها
            </p>
          </div>
          <div className="text-center">
            <p className="text-lg font-bold text-gray-800 dark:text-white">
              ۱۲
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              محصولات جدید
            </p>
          </div>
        </div>
      </header>

      {/* <!-- منوی تنظیمات ادمین --> */}
      <main className="p-3 space-y-1 flex flex-col   ">
        {userMenuData.map((item) => (
          <Dropdown.Item key={item.id}>
            <UserMenuItem item={item} />
          </Dropdown.Item>
        ))}
      </main>
      <div>
        {userMenuData.map(
          (item) =>
            item.type === "action" && (
              <div
                className="flex justify-between items-center p-4 p  text-gray-700"
                key={item.id}
              >
                <div className="flex ">
                  <span className=" font-medium  text-gray-700 dark:text-gray-300 hover:bg-amber-50 dark:hover:bg-amber-900/20">
                    {item.title}
                  </span>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isDark}
                    onChange={toggleTheme}
                    className="sr-only"
                  />

                  {/* Track */}
                  <div
                    className={` relative w-20 h-10 rounded-full transition-all duration-500
      ${
        isDark
          ? "bg-linear-to-r from-blue-400 to-primary"
          : "bg-linear-to-r from-yellow-300 to-orange-400"
      }
    `}
                  >
                    {/* Thumb */}
                    <div
                      className={` absolute top-1 flex h-8 w-8 items-center justify-center rounded-full bg-white shadow-md transition-all duration-500
        ${isDark ? "left-11" : "left-1"}
      `}
                    >
                      {isDark ? (
                        <Moon size={18} className="text-primary" />
                      ) : (
                        <Sun size={18} className="text-orange-500" />
                      )}
                    </div>
                  </div>
                </label>
              </div>
            ),
        )}
      </div>

      {/* <!-- اطلاعات سیستم و نسخه --> */}
      <div className="px-4 py-2 bg-gray-50 dark:bg-slate-800/50 border-y border-gray-100 dark:border-slate-700/50">
        <div className="flex items-center justify-between text-xs">
          <span className="text-gray-500 dark:text-gray-400">نسخه سیستم</span>
          <span className="font-mono text-amber-600 dark:text-amber-400">
            v2.5.0
          </span>
        </div>
        <div className="flex items-center justify-between text-xs mt-1">
          <span className="text-gray-500 dark:text-gray-400">آخرین ورود</span>
          <span className="text-gray-700 dark:text-gray-300">
            ۱۴۰۴/۰۲/۱۰ - ۱۴:۳۰
          </span>
        </div>
      </div>

      {/* <!-- دکمه خروج از سیستم --> */}
      <footer className="p-3">
        <div className="exit-admin w-full flex items-center justify-between gap-3 px-3 py-2.5 rounded-xl bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/40 transition-all duration-200 group/exit">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
              <div className="w-4 h-4 text-red-600 dark:text-red-400">
                <X size={18} />
              </div>
            </div>
            <div>
              <span className="text-sm font-medium text-red-600 dark:text-red-400">
                خروج از سیستم
              </span>
              <p className="text-xs text-red-400 dark:text-red-500">
                برای امنیت بیشتر
              </p>
            </div>
          </div>
          <div className="w-4 h-4 text-red-400 group-hover/exit:translate-x-1 transition-transform">
            <ChevronLeft size={18} />
          </div>
        </div>
      </footer>

      {/* <!-- خط تزئینی --> */}
      <div className="h-0.5 bg-linear-to-r from-transparent via-amber-500 to-transparent"></div>
    </div>
  );
}

export default UserDropdown;
