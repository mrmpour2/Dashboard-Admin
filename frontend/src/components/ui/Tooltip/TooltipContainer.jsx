import clsx from "clsx";

function TooltipContainer({ children, className = "", ...props }) {
  return (
    <div className={clsx("relative inline-flex ", className)} {...props}>
      {children}
    </div>
  );
}

export default TooltipContainer;
