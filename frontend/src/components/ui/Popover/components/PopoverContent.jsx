import clsx from "clsx";
import usePopover from "../context/usePopover";
import PopoverArrow from "./PopoverArrow";
import PopoverVariants from "../PopoverVariants";

function PopoverContent({ side = "top", className = "", children, ...props }) {
  const { open } = usePopover();
  if (!open) return null;
  const variant = PopoverVariants[side] || PopoverVariants.bottom;
  return (
    <div
      role="dialog"
      className={clsx(
        "absolute z-50 w-max max-w-xs ",
        variant.content,
        "rounded-md bg-Surface px-3 py-1.5 text-xs text-background",
        "border border-Border shadow-md animate-in fade-in zoom-in-95 duration-150",
        className,
      )}
      {...props}
    >
      {<span className="relative z-10">{children}</span>}
      <PopoverArrow className={variant.arrow} />
    </div>
  );
}

export default PopoverContent;
