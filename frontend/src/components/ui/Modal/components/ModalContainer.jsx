import { createPortal } from "react-dom";
import { useRef } from "react";
import useModal from "../context/useModal";
import useClickOutside from "../../../../hooks/useClickOutside";
import useEscapeKey from "../../../../hooks/useEscapeKey";
import clsx from "clsx";
import ModalOverlay from "./ModalOverlay";

function ModalContainer({ children, className = "", ...props }) {
  const { open, setOpen } = useModal();
  const ModalRef = useRef();
  useClickOutside(ModalRef, () => setOpen(false));
  useEscapeKey(() => setOpen(false));

  if (!open) return null;

  return createPortal(
    <div
      ref={ModalRef}
      className={clsx(
        "fixed inset-0 flex items-center justify-center pointer-events-none z-50",
        className,
      )}
      {...props}
    >
      <ModalOverlay />
      {children}
    </div>,
    document.body,
  );
}

export default ModalContainer;
