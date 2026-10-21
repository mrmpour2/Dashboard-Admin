import clsx from "clsx";
import useCombobox from "../context/useCombobox";
import * as variants from "../ComboboxVariants";

function ComboboxContent({ children, variant = "default", className = "", ...props }) {
  const { open, listboxId } = useCombobox();

  if (!open) return null;

  return (
    <div
      id={listboxId}
      role="listbox"
      className={clsx(
        "absolute left-0 right-0 top-full z-50 mt-2",
        "max-h-60 overflow-auto rounded-md p-1",
        "animate-in fade-in zoom-in-95 duration-150",
        variants.content[variant],
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export default ComboboxContent;
