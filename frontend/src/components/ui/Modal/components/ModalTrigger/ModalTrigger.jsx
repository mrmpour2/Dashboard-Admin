import { Children, cloneElement, isValidElement } from "react";
import clsx from "clsx";
import useModal from "../../context/useModal";
export default function ModalTrigger({ children, className = "", disabled = false, onClick, ...props }) {
  const { open, toggle } = useModal();
  const child = Children.count(children) === 1 ? Children.only(children) : null;
  const handleClick = (event) => { if (disabled) return; child?.props?.onClick?.(event); onClick?.(event); if (!event.defaultPrevented) toggle(); };
  const triggerProps = { ...props, disabled, onClick: handleClick, "aria-expanded": open, "aria-haspopup": "dialog", className: clsx(child?.props?.className, className) };
  if (isValidElement(child) && (child.type === "button" || typeof child.type === "function")) return cloneElement(child, triggerProps);
  return <button type="button" {...triggerProps}>{children}</button>;
}
