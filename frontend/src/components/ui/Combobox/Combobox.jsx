import ComboboxProvider from "./context/ComboboxProvider";

import ComboboxContainer from "./ComboboxContainer";
import ComboboxTrigger from "./components/ComboboxTrigger";
import ComboboxInput from "./components/ComboboxInput";
import ComboboxValue from "./components/ComboboxValue";
import ComboboxContent from "./components/ComboboxContent";
import ComboboxItem from "./components/ComboboxItem";
import ComboboxEmpty from "./components/ComboboxEmpty";

function Combobox({
  children,
  value,
  defaultValue = null,
  onValueChange,
  open,
  defaultOpen = false,
  onOpenChange,
}) {
  return (
    <ComboboxProvider
      value={value}
      defaultValue={defaultValue}
      onValueChange={onValueChange}
      open={open}
      defaultOpen={defaultOpen}
      onOpenChange={onOpenChange}
    >
      {children}
    </ComboboxProvider>
  );
}

Combobox.Container = ComboboxContainer;
Combobox.Trigger = ComboboxTrigger;
Combobox.Input = ComboboxInput;
Combobox.Value = ComboboxValue;
Combobox.Content = ComboboxContent;
Combobox.Item = ComboboxItem;
Combobox.Empty = ComboboxEmpty;

export default Combobox;
