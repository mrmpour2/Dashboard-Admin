import { useState } from "react";
import PopoverContext from "./PopoverContext";

function PopoverProvider({ children }) {
  const [open, setOpen] = useState(false);
  return (
    <PopoverContext.Provider value={{ open, setOpen }}>
      {children}
    </PopoverContext.Provider>
  );
}

export default PopoverProvider;
