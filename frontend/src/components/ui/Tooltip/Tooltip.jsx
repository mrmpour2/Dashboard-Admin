import TooltipProvider from "./context/TooltipProvider";
import TooltipContainer from "./TooltipContainer";
import TooltipTrigger from "./components/TooltipTrigger";
import TooltipContent from "./components/TooltipContent";
function Tooltip({ children }) {
  return <TooltipProvider>{children}</TooltipProvider>;
}
Tooltip.Container = TooltipContainer;
Tooltip.Trigger = TooltipTrigger;
Tooltip.Content = TooltipContent;
export default Tooltip;
