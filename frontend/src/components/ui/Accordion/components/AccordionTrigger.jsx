import { ChevronLeft } from "lucide-react";
import useAccordion from "../context/useAccordion";
import { accordionVariants } from "./variants";
import clsx from "clsx";

function AccordionTrigger({ value, children }) {
  const { isActive, setIsActive } = useAccordion();
  const active = isActive === value;
  return (
    <button
      type="button"
      onClick={() => setIsActive(active ? null : value)}
      aria-expanded={active}
      aria-controls={`panel-${value}`}
      id={`accordion-${value}`}
      className={clsx(
        " flex flex-1 items-center justify-between gap-4 py-4 text-sm font-medium transition-all cursor-pointer",
        "hover:underline",
        accordionVariants[active ? "active" : "inactive"],
      )}
    >
      {children}
      <ChevronLeft
        size={18}
        className={clsx(
          "shrink-0 text-muted-foreground transition-transform duration-200",
          active && "-rotate-90",
        )}
      />
    </button>
  );
}

export default AccordionTrigger;
