import clsx from "clsx";
import useTabs from "../TabContext/useTabs";
import { tabsVariant } from "./TabsVariant";
function TabsTrigger({ value = "profile", children }) {
  const { activeTab, setActiveTab } = useTabs();
  const isActive = activeTab === value;
  return (
    <button
      onClick={() => setActiveTab(value)}
      type="button"
      role="tab"
      tabIndex={isActive ? "0" : "-1"}
      aria-selected={isActive}
      aria-controls={`panel-${value}`}
      id={`tab-${value}`}
      className={clsx(
        "inline-flex h-8 items-center font-Vazir justify-center whitespace-nowrap rounded-md px-3 py-1.5 text-sm font-medium transition-all",
        tabsVariant[isActive ? "active" : "inactive"],
      )}
    >
      {children}
    </button>
  );
}

export default TabsTrigger;
