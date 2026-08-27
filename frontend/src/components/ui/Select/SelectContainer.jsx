import { useRef } from "react";
import useClickOutside from "../../../hooks/useClickOutside";
import useSelect from "./context/useSelect";
import useEscapeKey from "../../../hooks/useEscapeKey";
import clsx from "clsx";

function SelectContainer({ children, className = "" }) {
  const { setOpen } = useSelect();
  const selectContainerRef = useRef();
  useClickOutside(selectContainerRef, () => setOpen(false));
  useEscapeKey(() => setOpen(false));
  return (
    <div
      ref={selectContainerRef}
      className={clsx("relative inline-block w-64", className)}
    >
      {children}
    </div>
  );
}

export default SelectContainer;
