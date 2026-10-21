import { useContext } from "react";
import AccordionContext from "./AccordionContext";
function useAccordion() {
  const context = useContext(AccordionContext);
  return context;
}

export default useAccordion;
