import { Outlet } from "react-router";
import SideBar from "./SideBar/SideBar";
import TopBar from "./TopBar/TopBar";

function DashboardLayout() {
  return (
    <main className="min-h-screen bg-slate-100 ">
      <SideBar />

      <section
        className="
      relative
      z-20
      ms-60
      min-h-screen
      rounded-s-4xl 
     bg-Surface
      shadow-xl
  "
      >
        <TopBar />

        <div id="content" className="flex-1  p-6 ">
          <Outlet />
        </div>
      </section>
    </main>
  );
}

export default DashboardLayout;
