import clsx from "clsx";
import useDropdown from "../context/useDropdown";
import { alignVariants, sideVariants } from "../dropdownVariants";

function DropdownContent({
  children,
  className = "",
  align = "start",
  side = "bottom",
  role = "menu",
  ...props
}) {
  const { open } = useDropdown();
  if (!open) return null;

  return (
    <div
      role={role}
      className={clsx(
        "absolute z-50 mt-2 flex max-h-96 min-w-48 flex-col overflow-y-auto overflow-x-hidden rounded-xl border border-Border bg-Surface shadow-Dropdown",
        alignVariants[align] ?? alignVariants.start,
        sideVariants[side] ?? sideVariants.bottom,
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export default DropdownContent;
