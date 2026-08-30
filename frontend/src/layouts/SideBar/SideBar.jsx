import SidebarHeader from "./components/SidebarHeader";
import SidebarContent from "./components/SidebarContent";

function SideBar() {
  return (
    <aside className="fixed inset-y-0 inset-s-0 z-10 h-screen w-72 overflow-y-auto bg-gradient-brand px-5 shadow-Glow">
      <div className="flex flex-col divide-y divide-white/10">
        <SidebarHeader />
        <SidebarContent />
      </div>
    </aside>
  );
}

export default SideBar;
