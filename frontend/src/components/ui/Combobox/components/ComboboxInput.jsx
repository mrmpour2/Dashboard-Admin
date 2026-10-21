import { forwardRef } from "react";
import clsx from "clsx";
import useCombobox from "../context/useCombobox";

const ComboboxInput = forwardRef(function ComboboxInput(
  {
    placeholder = "انتخاب کنید...",
    disabled = false,
    className = "",
    ...props
  },
  ref,
) {
  const {
    open,
    setOpen,
    searchValue,
    setSearchValue,
    listboxId,
    activeDescendantId,
    moveHighlight,
    selectHighlightedItem,
  } = useCombobox();

  const handleKeyDown = (event) => {
    if (disabled) return;

    switch (event.key) {
      case "ArrowDown":
        event.preventDefault();
        if (!open) setOpen(true);
        else moveHighlight("next");
        break;

      case "ArrowUp":
        event.preventDefault();
        if (!open) setOpen(true);
        else moveHighlight("prev");
        break;

      case "Home":
        if (open) {
          event.preventDefault();
          moveHighlight("first");
        }
        break;

      case "End":
        if (open) {
          event.preventDefault();
          moveHighlight("last");
        }
        break;

      case "Enter":
        event.preventDefault();
        if (open) selectHighlightedItem();
        break;

      case "Escape":
        event.preventDefault();
        setOpen(false);
        break;

      default:
        break;
    }
  };

  return (
    <input
      {...props}
      ref={ref}
      type="text"
      role="combobox"
      aria-expanded={open}
      aria-autocomplete="list"
      aria-controls={listboxId}
      aria-activedescendant={activeDescendantId}
      aria-haspopup="listbox"
      disabled={disabled}
      value={searchValue}
      placeholder={placeholder}
      onFocus={() => !disabled && setOpen(true)}
      onKeyDown={handleKeyDown}
      onChange={(event) => {
        setSearchValue(event.target.value);
        if (!open) setOpen(true);
      }}
      className={clsx(
        "w-full rounded-md border px-3 py-2",
        "outline-none transition",
        "focus:ring-2 focus:ring-primary/30",
        "disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
    />
  );
});

export default ComboboxInput;
