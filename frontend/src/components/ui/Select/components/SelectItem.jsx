import useSelect from "../context/useSelect";
import { statusSelect } from "../SelectVariants";
import clsx from "clsx";

function SelectItem({
  className = "",
  disabled = false,
  onClick,
  children,
  value,
  ...props
}) {
  const { setOpen, selectValue, setSelectValue } = useSelect();

  const AddValueItem = {
    value,
    label: children,
  };

  const handleClick = (e) => {
    if (disabled) return;

    onClick?.(e);

    if (!e.defaultPrevented) {
      setSelectValue(AddValueItem);
      setOpen(false);
    }
  };
  const isSelected = selectValue?.value === value;
  return (
    <button
      role="option"
      type="button"
      className={clsx(
        "flex w-full cursor-pointer items-center rounded-sm px-2 py-1.5 text-sm outline-none transition-colors hover:bg-muted",
        disabled
          ? statusSelect.disabled
          : isSelected
            ? statusSelect.selected
            : statusSelect.active,
        className,
      )}
      {...props}
      onClick={handleClick}
      disabled={disabled}
      aria-disabled={disabled}
      aria-selected={isSelected}
    >
      {children}
    </button>
  );
}

export default SelectItem;
