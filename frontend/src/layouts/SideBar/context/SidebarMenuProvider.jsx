import { useEffect, useState, useCallback } from "react";
import { useLocation } from "react-router";
import SidebarMenuContext from "./SidebarMenuContext";

function SidebarMenuProvider({ children }) {
  const [isOpen, setIsOpen] = useState(false);
  const location = useLocation();

  const open = useCallback(() => setIsOpen(true), []);
  const close = useCallback(() => setIsOpen(false), []);
  const toggle = useCallback(() => setIsOpen((prev) => !prev), []);

  /* eslint-disable react-hooks/set-state-in-effect -- syncs internal state
     with the current router location, an external source, not a value
     derived from this component's own previous render. */
  useEffect(() => {
    setIsOpen(false);
  }, [location.pathname]);
  /* eslint-enable react-hooks/set-state-in-effect */

  return (
    <SidebarMenuContext.Provider value={{ isOpen, open, close, toggle }}>
      {children}
    </SidebarMenuContext.Provider>
  );
}

export default SidebarMenuProvider;
