import useAccordion from "../context/useAccordion";
import clsx from "clsx";

function AccordionContent({ children, value, className = "", ...props }) {
  const { isActive } = useAccordion();
  if (value !== isActive) return null;
  return (
    <div
      role="region"
      aria-labelledby={`accordion-${value}`}
      id={`panel-${value}`}
      className={clsx(
        "  duration-300 ease-in-out",
        "animate-in fade-in slide-in-from-bottom-1 duration-300 ease-out",
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export default AccordionContent;
