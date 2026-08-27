import PopoverProvider from "./context/PopoverProvider";
import PopoverContainer from "./PopoverContainer";
import PopoverTrigger from "./components/PopoverTrigger";
import PopoverContent from "./components/PopoverContent";
function Popover({ children }) {
  return <PopoverProvider>{children}</PopoverProvider>;
}
Popover.Container = PopoverContainer;
Popover.Trigger = PopoverTrigger;
Popover.Content = PopoverContent;
export default Popover;
