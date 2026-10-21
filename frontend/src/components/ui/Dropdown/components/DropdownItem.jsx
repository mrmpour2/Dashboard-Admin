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
          "hover:bg-SurfaceMuted": !disabled,
          "opacity-50 cursor-not-allowed": disabled,
          "text-textSecondary": !disabled,
          "text-textMuted": disabled,
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
