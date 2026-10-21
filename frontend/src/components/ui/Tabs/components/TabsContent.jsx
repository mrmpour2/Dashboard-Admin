import clsx from "clsx";
import useTabs from "../TabContext/useTabs";

function TabsContent({ children, value, className = "", ...props }) {
  const { activeTab } = useTabs();
  if (value !== activeTab) return null;
  return (
    <div
      role="tabpanel"
      className={clsx(
        "mt-3 rounded-lg  p-4 text-sm font-Vazir shadow-Card",
        "animate-in fade-in slide-in-from-bottom-1 duration-300 ease-out",
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export default TabsContent;
