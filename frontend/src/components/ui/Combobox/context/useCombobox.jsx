import { useContext } from "react";
import ComboboxContext from "./ComboboxContext";

function useCombobox() {
  const context = useContext(ComboboxContext);

  if (!context) {
    throw new Error("useCombobox must be used inside a ComboboxProvider");
  }

  return context;
}

export default useCombobox;
