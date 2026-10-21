import clsx from "clsx";
import useTooltip from "../context/useTooltip";
import TooltipArrow from "./TooltipArrow";
import TooltipVariants from "../TooltipVariants";

function TooltipContent({ side = "left", className = "", children, ...props }) {
  const { open } = useTooltip();
  if (!open) return null;
  const variant = TooltipVariants[side];
  return (
    <div
      role="tooltip"
      className={clsx(
        "absolute z-50 w-max max-w-xs",
        variant.content,
        "rounded-md bg-secondary px-3 py-1.5 text-xs text-background",
        "shadow-md animate-in fade-in zoom-in-95 duration-150",
        className,
      )}
      {...props}
    >
      {<span className="relative z-10">{children}</span>}
      <TooltipArrow className={variant.arrow} />
    </div>
  );
}

export default TooltipContent;
