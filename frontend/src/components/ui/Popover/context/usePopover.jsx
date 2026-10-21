import { useContext } from "react";
import PopoverContext from "./PopoverContext";

function usePopover() {
  const context = useContext(PopoverContext);
  return context;
}

export default usePopover;
