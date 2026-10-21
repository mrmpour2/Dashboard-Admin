import { useContext } from "react";
import TabsContext from "./TabsContext";

const useTabs = () => {
  const context = useContext(TabsContext);
  return context;
};

export default useTabs;
