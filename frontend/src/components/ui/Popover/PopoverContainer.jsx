import { useRef } from "react";
import usePopover from "./context/usePopover";
import useClickOutside from "../../../hooks/useClickOutside";
import useEscapeKey from "../../../hooks/useEscapeKey";
import clsx from "clsx";

function PopoverContainer({ children, className = "", ...props }) {
  const { setOpen } = usePopover();
  const PopoverRef = useRef();
  useClickOutside(PopoverRef, () => setOpen(false));
  useEscapeKey(() => setOpen(false));
  return (
    <div
      ref={PopoverRef}
      className={clsx("relative inline-flex w-fit", className)}
      {...props}
    >
      {children}
    </div>
  );
}

export default PopoverContainer;
