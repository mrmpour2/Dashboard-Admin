import { useEffect, useRef } from "react";
import clsx from "clsx";
import useCombobox from "./context/useCombobox";

function ComboboxContainer({ children, className = "", ...props }) {
  const { open, setOpen } = useCombobox();
  const containerRef = useRef(null);

  // Click-outside-to-close: without this the dropdown only ever
  // closed via Escape or picking an item.
  useEffect(() => {
    if (!open) return;

    function handlePointerDown(event) {
      if (!containerRef.current?.contains(event.target)) {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, [open, setOpen]);

  return (
    <div
      ref={containerRef}
      className={clsx("relative w-full max-w-sm", className)}
      {...props}
    >
      {children}
    </div>
  );
}

export default ComboboxContainer;
