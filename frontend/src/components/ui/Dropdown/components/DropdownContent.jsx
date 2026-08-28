import clsx from "clsx";
import useDropdown from "../context/useDropdown";
import { alignVariants, sideVariants } from "../dropdownVariants";

function DropdownContent({
  children,
  className = "",
  align = "start",
  side = "botton",
  ...props
}) {
  const { open } = useDropdown();
  if (!open) return null;
  return (
    <div
      className={clsx(
        `absolute flex flex-col mt-1  overflow-y-auto bg-Surface rounded-xl shadow-lg border border-Border  z-50`,
        alignVariants[align],
        sideVariants[side],
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export default DropdownContent;
