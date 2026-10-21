import SelectProvider from "./context/SelectProvider";
import SelectContainer from "./SelectContainer";
import SelectTrigger from "./components/SelectTrigger";
import SelectContent from "./components/SelectContent";
import SelectItem from "./components/SelectItem";
import SelectValue from "./components/SelectValue";
function Select({ children }) {
  return <SelectProvider>{children}</SelectProvider>;
}
Select.Container = SelectContainer;
Select.Trigger = SelectTrigger;
Select.Content = SelectContent;
Select.Item = SelectItem;
Select.Value = SelectValue;
export default Select;
