import { createPortal } from "react-dom";
import { useEffect, useRef } from "react";
import useModal from "../context/useModal";
import useClickOutside from "../../../../hooks/useClickOutside";
import useEscapeKey from "../../../../hooks/useEscapeKey";
import clsx from "clsx";
import ModalOverlay from "./ModalOverlay";

function ModalContainer({ children, className = "", ...props }) {
  const { open, setOpen } = useModal();
  const modalRef = useRef(null);

  useClickOutside(modalRef, () => setOpen(false));
  useEscapeKey(() => setOpen(false));

  useEffect(() => {
    if (!open) return undefined;

    const previousFocus = document.activeElement;
    modalRef.current?.querySelector("button, input, select, textarea")?.focus();
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const onKeyDown = (event) => {
      if (event.key !== "Tab" || !modalRef.current) return;

      const focusable = modalRef.current.querySelectorAll(
        'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
      );
      if (!focusable.length) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      previousFocus?.focus?.();
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  if (!open) return null;

  return createPortal(
    <div
      ref={modalRef}
      className={clsx(
        "fixed inset-0 z-50 flex items-center justify-center p-4",
        className,
      )}
      {...props}
    >
      <ModalOverlay />
      <div className="relative z-10 w-full max-w-lg pointer-events-auto">
        {children}
      </div>
    </div>,
    document.body,
  );
}

export default ModalContainer;
