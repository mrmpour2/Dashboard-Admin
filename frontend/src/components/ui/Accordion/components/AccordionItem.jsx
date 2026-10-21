import clsx from "clsx";

function AccordionItem({ children, className = "", ...props }) {
  return (
    <div className={clsx("font-Vazir", className)} {...props}>
      {children}
    </div>
  );
}
export default AccordionItem;
