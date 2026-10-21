import { useContext } from "react";
import SidebarMenuContext from "./SidebarMenuContext";

function useSidebarMenu() {
  const context = useContext(SidebarMenuContext);
  if (!context) {
    throw new Error("useSidebarMenu باید داخل SidebarMenuProvider استفاده شود");
  }
  return context;
}

export default useSidebarMenu;
