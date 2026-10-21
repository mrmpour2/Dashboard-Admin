import { useState } from "react";
import AccordionContext from "./AccordionContext";

function AccordionProvider({ children }) {
  const [isActive, setIsActive] = useState(null);
  return (
    <AccordionContext.Provider value={{ isActive, setIsActive }}>
      {children}
    </AccordionContext.Provider>
  );
}

export default AccordionProvider;
