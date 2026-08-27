import { useRef } from "react";
import clsx from "clsx";
import useDropdown from "../context/useDropdown";

function DropdownItem({
  children,
  className = "",
  disabled = false,
  onClick,
  ...props
}) {
  const { setOpen } = useDropdown();

  const handleClick = (e) => {
    if (disabled) return null;

    onClick?.(e);

    if (!e.defaultPrevented) {
      setOpen(false);
    }
  };

  return (
    <button
      type="button"
      className={clsx(
        "rounded p-2 cursor-pointer block font-Vazir transition-colors duration-150",
        {
          "hover:bg-gray-100": !disabled,
          "opacity-50 cursor-not-allowed": disabled,
          "text-gray-700": !disabled,
          "text-gray-400": disabled,
        },
        className,
      )}
      {...props}
      onClick={handleClick}
      role="menuitem"
      aria-disabled={disabled}
    >
      {children}
    </button>
  );
}

export default DropdownItem;
