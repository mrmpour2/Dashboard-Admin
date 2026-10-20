import clsx from "clsx";
import useSelect from "../context/useSelect";
import { typeSelect, sizeSelect } from "../SelectVariants";

function SelectTrigger({
  children,
  type = "default",
  size = "md",
  disabled = false,
  className = "",
  ...props
}) {
  const { toggle, open } = useSelect();
  return (
    <button
      aria-haspopup="listbox"
      aria-expanded={open}
      type="button"
      disabled={disabled}
      onClick={!disabled ? toggle : undefined}
      className={clsx(
        "relative flex w-full items-center justify-between rounded-md font-medium outline-none transition-colors disabled:cursor-not-allowed disabled:opacity-50",
        typeSelect[type],
        sizeSelect[size],
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}

export default SelectTrigger;
