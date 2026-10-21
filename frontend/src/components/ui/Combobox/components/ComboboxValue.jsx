import clsx from "clsx";
import useCombobox from "../context/useCombobox";

function ComboboxValue({
  placeholder = "انتخاب کنید...",
  className = "",
  ...props
}) {
  const { comboboxValue } = useCombobox();

  return (
    <span
      className={clsx(
        "truncate",
        !comboboxValue && "text-muted-foreground",
        className,
      )}
      {...props}
    >
      {comboboxValue?.label ?? placeholder}
    </span>
  );
}

export default ComboboxValue;
