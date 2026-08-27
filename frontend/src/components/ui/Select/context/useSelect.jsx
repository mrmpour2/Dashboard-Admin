import React, { useContext } from "react";
import SelectContext from "./SelectContext";

function useSelect() {
  const context = useContext(SelectContext);
  return context;
}

export default useSelect;
