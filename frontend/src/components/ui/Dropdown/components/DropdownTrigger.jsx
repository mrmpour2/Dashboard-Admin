import clsx from "clsx";
import useDropdown from "../context/useDropdown";

function DropdownTrigger({ children, className = "", ...props }) {
  const { open, toggle } = useDropdown();

  return (
    <button
      type="button"
      onClick={toggle}
      aria-expanded={open}
      aria-haspopup="menu"
      className={clsx(className)}
      {...props}
    >
      {children}
    </button>
  );
}

export default DropdownTrigger;
