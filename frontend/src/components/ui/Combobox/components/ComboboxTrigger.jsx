import { forwardRef } from "react";
import clsx from "clsx";
import { ChevronLeft } from "lucide-react";
import useCombobox from "../context/useCombobox";
import * as variants from "../ComboboxVariants";

const ComboboxTrigger = forwardRef(function ComboboxTrigger(
  {
    children,
    variant = "default",
    size = "md",
    className = "",
    onClick,
    ...props
  },
  ref,
) {
  const { open, searchValue, toggle } = useCombobox();

  // Only toggle when the trigger's own surface is clicked, not a
  // focusable child like ComboboxInput — otherwise focusing the
  // input (which opens the list) and the trigger's click handler
  // fight each other and the list flickers open/closed.
  const handleClick = (event) => {
    onClick?.(event);
    if (event.defaultPrevented) return;
    if (event.target === event.currentTarget) {
      toggle();
    }
  };

  const handleKeyDown = (event) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      toggle();
    }
  };

  return (
    <div
      {...props}
      ref={ref}
      role="button"
      tabIndex={0}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      className={clsx(
        "max-w-3xs flex rounded-md items-center justify-between",
        "font-Vazir font-medium cursor-pointer",
        variants.type[variant],
        variants.size[size],
        className,
      )}
    >
      {children}
      <ChevronLeft
        size={18}
        onClick={(event) => {
          // The chevron sits inside the trigger, so it never equals
          // event.currentTarget above — give it its own toggle.
          event.stopPropagation();
          toggle();
        }}
        className={clsx(
          "shrink-0 transition-transform duration-200",
          (open || searchValue) && "-rotate-90",
        )}
      />
    </div>
  );
});

export default ComboboxTrigger;
