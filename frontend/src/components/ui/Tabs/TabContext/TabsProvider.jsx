import { useState } from "react";
import TabsContext from "./TabsContext";
function TabsProvider({ children }) {
  const [activeTab, setActiveTab] = useState("profile");
  return (
    <TabsContext.Provider value={{ activeTab, setActiveTab }}>
      {children}
    </TabsContext.Provider>
  );
}

export default TabsProvider;
