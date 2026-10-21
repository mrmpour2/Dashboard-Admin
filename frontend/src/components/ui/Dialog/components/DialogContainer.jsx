import { useRef } from "react";
import { createPortal } from "react-dom";
import useDialog from "../context/useDialog";
import useClickOutside from "../../../../hooks/useClickOutside";
import useEscapeKey from "../../../../hooks/useEscapeKey";
import clsx from "clsx";
import DialogOverlay from "./DialogOverlay";

function DialogContainer({ children, className, ...props }) {
  const { open, setOpen } = useDialog();
  const DialogRef = useRef();
  useClickOutside(DialogRef, () => setOpen(false));
  useEscapeKey(() => setOpen(false));

  if (!open) return null;

  return createPortal(
    <div
      className={clsx(
        "fixed inset-0 flex items-center justify-center z-50",
        className,
      )}
      {...props}
    >
      <DialogOverlay />
      <div ref={DialogRef} className="pointer-events-auto relative">
        {children}
      </div>
    </div>,
    document.body,
  );
}

export default DialogContainer;
