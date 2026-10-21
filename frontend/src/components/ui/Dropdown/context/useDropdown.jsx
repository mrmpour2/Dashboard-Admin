import { useContext } from "react";
import DropdownContext from "./DropdownContext";
function useDropdown() {
  const context = useContext(DropdownContext);

  return context;
}

export default useDropdown;
