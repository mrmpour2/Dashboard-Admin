import SidebarHeader from "./components/SidebarHeader";
import SidebarContent from "./components/SidebarContent";

function SideBar() {
  return (
    <aside className="fixed inset-y-0 inset-s-0 z-10 h-screen w-72  bg-primary dark:bg-Danger px-5">
      <div className="divide-y divide-gray-100/50 w-48 ">
        <SidebarHeader />
        <SidebarContent />
      </div>
    </aside>
  );
}

export default SideBar;
