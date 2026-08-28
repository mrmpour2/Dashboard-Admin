import clsx from "clsx";
import { useId } from "react";
import HelperText from "./Message/HelperText";
import Error from "./Message/Error";
import Label from "./Label";

function Input({
  type = "text",
  label,
  placeholder,
  error,
  className = "",
  helperText,
  required,
  disabled = false,
  icon,
  id,
  ...props
}) {
  const generatedId = useId();
  const inputID = id || generatedId;
  return (
    <div className={` flex flex-col gap-2 font-Vazir ${className}`}>
      <div className=" h-12 relative flex justify-between  rounded-Input">
        <input
          id={inputID}
          type={type}
          placeholder={placeholder}
          disabled={disabled}
          required={required}
          className={clsx(
            error
              ? "w-full border-b border-red-600 py-1 focus:border-b-2 focus:border-red-600 transition-colors focus:outline-none peer bg-inherit"
              : "w-full border-b border-Border py-1  focus:border-b-2 focus:border-primary transition-colors focus:outline-none peer bg-inherit",
            {
              "w-full border-b border-Border text-textMuted py-1": disabled,
            },
            className,
          )}
          {...props}
        />
        {icon && (
          <div className="absolute left-3 top-1/2 items-end  -translate-y-1/2 text-textMuted pointer-events-non">
            {icon}
          </div>
        )}
        {label && <Label label={label} inputID={inputID} required={required} />}
      </div>

      {helperText && <HelperText message={helperText} />}
      {error && <Error message={error} />}
    </div>
  );
}

export default Input;
