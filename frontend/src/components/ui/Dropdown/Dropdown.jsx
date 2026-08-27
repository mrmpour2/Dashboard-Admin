import clsx from "clsx";
import DropdownProvider from "./context/DropdownProvider";
import DropdownTrigger from "./components/DropdownTrigger";
import DropdownContent from "./components/DropdownContent";
import DropdownItem from "./components/DropdownItem";
import DropdownRoot from "./components/DropdownRoot";

function Dropdown({
  children,
  closeOnEscape = true,
  closeOnOutsideClick = true,
}) {
  return (
    <DropdownProvider>
      <DropdownRoot
        closeOnEscape={closeOnEscape}
        closeOnOutsideClick={closeOnOutsideClick}
      >
        {children}
      </DropdownRoot>
    </DropdownProvider>
  );
}
Dropdown.Trigger = DropdownTrigger;
Dropdown.Content = DropdownContent;
Dropdown.Item = DropdownItem;
export default Dropdown;
