import clsx from "clsx";
import useSelect from "../context/useSelect";
import { contentSelect } from "../SelectVariants";

function SelectContent({
  children,
  className = "",
  elevated = false,
  ...props
}) {
  const { open } = useSelect();
  if (!open) return null;
  return (
    <div
      role="listbox"
      className={clsx(
        "absolute top-full right-0 z-50 mt-1 w-full rounded-md p-1",
        "animate-in fade-in zoom-in-95 duration-150",
        contentSelect[elevated ? "elevated" : "default"],
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export default SelectContent;
