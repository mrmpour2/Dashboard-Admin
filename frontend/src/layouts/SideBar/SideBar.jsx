import clsx from "clsx";
import SidebarHeader from "./components/SidebarHeader";
import SidebarContent from "./components/SidebarContent";

function SideBar({ mobileOpen = false, onClose }) {
  return (
    <>
      {mobileOpen && (
        <button
          type="button"
          aria-label="بستن منوی کناری"
          onClick={onClose}
          className="fixed inset-0 z-30 bg-black/40 md:hidden"
        />
      )}

      <aside
        aria-label="منوی اصلی"
        className={clsx(
          "fixed inset-y-0 start-0 z-40 h-screen w-64 overflow-y-auto border-e border-Border bg-Surface px-4 transition-transform duration-200",
          "ltr:md:translate-x-0 rtl:md:translate-x-0",
          mobileOpen
            ? "translate-x-0"
            : "hidden md:block ltr:-translate-x-full rtl:translate-x-full md:translate-x-0",
        )}
      >
        <div className="flex min-h-full flex-col">
          <SidebarHeader />
          <SidebarContent onNavigate={onClose} />
          <div className="mt-auto border-t border-Border py-5 text-xs leading-6 text-textSecondary">Nebula<br />مدیریت فروشگاه، در یک نگاه</div>
        </div>
      </aside>
    </>
  );
}

export default SideBar;
