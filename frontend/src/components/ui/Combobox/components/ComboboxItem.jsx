import { forwardRef, useEffect, useId, useRef } from "react";
import clsx from "clsx";
import useCombobox from "../context/useCombobox";
import { matchesSearchValue, mergeRefs } from "../utils";
import * as variants from "../ComboboxVariants";

const ComboboxItem = forwardRef(function ComboboxItem(
  { value, children, label, disabled = false, className = "", onClick, ...props },
  forwardedRef,
) {
  const {
    comboboxValue,
    searchValue,
    highlightedValue,
    setValue,
    setSearchValue,
    setOpen,
    registerItem,
    unregisterItem,
  } = useCombobox();

  const itemRef = useRef(null);
  const itemId = useId();

  const itemLabel = label ?? (typeof children === "string" ? children : String(value));

  // Computed locally (not just via the registry) so the item can
  // decide for itself whether to render. It stays mounted and just
  // returns null when hidden — see ComboboxProvider for why that
  // matters for keyboard-navigation order.
  const matches = matchesSearchValue(itemLabel, searchValue);

  useEffect(() => {
    registerItem({ value, label: itemLabel, disabled, ref: itemRef, id: itemId });
    return () => unregisterItem(value);
  }, [value, itemLabel, disabled, itemId, registerItem, unregisterItem]);

  if (!matches) return null;

  // String() comparison so a numeric `value` prop still matches a
  // controlled value passed in as a string (or vice versa).
  const isSelected = String(comboboxValue?.value) === String(value);
  const isHighlighted = String(highlightedValue) === String(value);

  const handleClick = (event) => {
    if (disabled) {
      event.preventDefault();
      return;
    }

    onClick?.(event);
    if (event.defaultPrevented) return;

    setValue({ value, label: itemLabel });
    setSearchValue(itemLabel);
    setOpen(false);
  };

  return (
    <button
      {...props}
      id={itemId}
      ref={mergeRefs(itemRef, forwardedRef)}
      type="button"
      role="option"
      disabled={disabled}
      aria-disabled={disabled}
      aria-selected={isSelected}
      onClick={handleClick}
      className={clsx(
        "flex w-full items-center rounded-sm",
        "px-3 py-2 text-sm text-right",
        "transition-colors",
        "hover:bg-muted",
        "disabled:pointer-events-none",
        isHighlighted && "bg-muted",
        isSelected ? variants.status.selected : variants.status.active,
        disabled && variants.status.disabled,
        className,
      )}
    >
      {children}
    </button>
  );
});

export default ComboboxItem;
