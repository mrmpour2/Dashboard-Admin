import { useState } from "react";
import { Outlet } from "react-router";
import { Menu, X } from "lucide-react";
import SideBar from "./SideBar/SideBar";
import TopBar from "./TopBar/TopBar";

function DashboardLayout() {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <main className="min-h-screen bg-Background transition-colors duration-300">
      <a href="#content" className="fixed start-4 top-4 z-50 -translate-y-24 rounded-lg bg-primary px-4 py-2 text-white focus:translate-y-0">رفتن به محتوای اصلی</a>
      <SideBar mobileOpen={mobileOpen} onClose={() => setMobileOpen(false)} />

      <section
        className="
          relative z-20 min-h-screen
          bg-Background
          ms-0 md:ms-64
        "
      >
        <TopBar
          mobileMenuButton={
            <button
              type="button"
              onClick={() => setMobileOpen((open) => !open)}
              aria-label={mobileOpen ? "بستن منو" : "باز کردن منو"}
              aria-expanded={mobileOpen}
              className="rounded-xl p-2 text-textPrimary transition hover:bg-SurfaceMuted focus:outline-none focus:ring-2 focus:ring-primary/30 md:hidden"
            >
              {mobileOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          }
        />

        <div id="content" tabIndex={-1} className="mx-auto w-full max-w-[1600px] flex-1 p-4 sm:p-6 lg:p-8">
          <Outlet />
        </div>
      </section>
    </main>
  );
}

export default DashboardLayout;
