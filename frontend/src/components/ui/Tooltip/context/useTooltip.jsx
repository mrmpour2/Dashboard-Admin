import React, { useContext } from "react";
import TooltipContext from "./TooltipContext";

function useTooltip() {
  const context = useContext(TooltipContext);
  return context;
}

export default useTooltip;
