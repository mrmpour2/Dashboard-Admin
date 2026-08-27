import DialogContext from "./DialogContext";
import { useContext } from "react";

function useDialog() {
  const context = useContext(DialogContext);
  return context;
}

export default useDialog;
