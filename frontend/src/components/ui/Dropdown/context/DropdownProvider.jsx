import { useState } from "react";
import DropdownContext from "./DropdownContext";

function DropdownProvider({ children }) {
  const [open, setOpen] = useState(false);
  const toggle = () => {
    setOpen((prev) => !prev);
  };

  return (
    <DropdownContext.Provider value={{ open, setOpen, toggle }}>
      {children}
    </DropdownContext.Provider>
  );
}

export default DropdownProvider;
