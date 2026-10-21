import { useRef } from "react";
import useDropdown from "../context/useDropdown";
import useClickOutside from "../../../../hooks/useClickOutside";
import useEscapeKey from "../../../../hooks/useEscapeKey";
import clsx from "clsx";
function DropdownRoot({
  children,
  className,
  closeOnEscape,
  closeOnOutsideClick,
}) {
  const { setOpen } = useDropdown();
  const userMenuRef = useRef();
  useClickOutside(userMenuRef, () => setOpen(false), Boolean(closeOnOutsideClick));
  useEscapeKey(() => setOpen(false), Boolean(closeOnEscape));
  return (
    <div className={clsx("relative inline-block", className)} ref={userMenuRef}>
      {children}
    </div>
  );
}

export default DropdownRoot;
