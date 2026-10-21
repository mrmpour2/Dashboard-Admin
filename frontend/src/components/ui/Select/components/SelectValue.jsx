// TooltipArrow.jsx
import clsx from "clsx";
import useSelect from "../context/useSelect";

function SelectValue({ placeholder = "...", className = "" }) {
  const { selectValue } = useSelect();
  return (
    <div className={clsx(className)}>
      {selectValue ? selectValue.label : placeholder}
    </div>
  );
}

export default SelectValue;
