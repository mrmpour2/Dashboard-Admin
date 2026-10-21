import clsx from "clsx";
import { useId } from "react";
import HelperText from "./Message/HelperText";
import Error from "./Message/Error";
import Label from "./Label";

function Input({
  type = "type",
  label,
  placeholder = "",
  error,
  className = "",
  containerClassName = "",
  helperText,
  required = false,
  disabled = false,
  icon,
  id,
  ...props
}) {
  const generatedId = useId();
  const inputID = id || generatedId;
  const describedBy =
    [helperText ? `${inputID}-help` : null, error ? `${inputID}-error` : null]
      .filter(Boolean)
      .join(" ") || undefined;

  return (
    <div className={clsx("flex flex-col gap-2 font-Vazir", containerClassName)}>
      <div className="relative flex h-12 items-center rounded-Input">
        <input
          id={inputID}
          type={type}
          placeholder={placeholder}
          disabled={disabled}
          required={required}
          aria-invalid={Boolean(error)}
          aria-describedby={describedBy}
          className={clsx(
            "peer w-auto min-w-20 flex-1 border-b bg-inherit py-1 transition-colors focus:border-b-2 focus:outline-none",
            error
              ? "border-red-600 focus:border-red-600"
              : "border-Border focus:border-primary",
            disabled && "cursor-not-allowed border-Border text-textMuted",
            icon && "pe-10",
            className,
          )}
          {...props}
        />

        {icon && (
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-3 top-1/2 -translate-y-1/2 text-textMuted"
          >
            {icon}
          </div>
        )}

        {label && <Label label={label} inputID={inputID} required={required} />}
      </div>

      {helperText && <HelperText id={`${inputID}-help`} message={helperText} />}
      {error && <Error id={`${inputID}-error`} message={error} />}
    </div>
  );
}

export default Input;
