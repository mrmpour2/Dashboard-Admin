import { Children, cloneElement, isValidElement } from "react";
import clsx from "clsx";
import useDropdown from "../context/useDropdown";
export default function DropdownTrigger({ children, className = "", onClick, ...props }) {
  const { open, toggle } = useDropdown();
  const child = Children.count(children) === 1 ? Children.only(children) : null;
  const handleClick = (event) => { child?.props?.onClick?.(event); onClick?.(event); if (!event.defaultPrevented) toggle(); };
  const triggerProps = { ...props, onClick: handleClick, "aria-expanded": open, "aria-haspopup": "menu", className: clsx(child?.props?.className, className) };
  if (isValidElement(child) && child.type === "button") return cloneElement(child, triggerProps);
  return <button type="button" {...triggerProps}>{children}</button>;
}
