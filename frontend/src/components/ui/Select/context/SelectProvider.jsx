import { useState } from "react";
import SelectContext from "./SelectContext";

function SelectProvider({ children }) {
  const [open, setOpen] = useState(false);
  const [selectValue, setSelectValue] = useState(null);
  const toggle = () => {
    setOpen((prev) => !prev);
  };
  return (
    <SelectContext.Provider
      value={{ open, setOpen, toggle, selectValue, setSelectValue }}
    >
      {children}
    </SelectContext.Provider>
  );
}

export default SelectProvider;
