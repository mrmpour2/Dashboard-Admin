import { useState } from "react";
import TooltipContext from "./TooltipContext";

function TooltipProvider({ children }) {
  const [open, setOpen] = useState(false);
  return (
    <TooltipContext.Provider value={{ open, setOpen }}>
      {children}
    </TooltipContext.Provider>
  );
}

export default TooltipProvider;
