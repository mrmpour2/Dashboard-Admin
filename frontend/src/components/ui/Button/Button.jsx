import clsx from "clsx";
import { buttonSizes } from "./buttonSizing";
import { buttonVariants } from "./buttonVariants";
import IconButton from "./IconButton";
function Button({
  children,
  size = "md",
  icon,
  loading = false,
  variant = "primary",
  className = "",
  ...props
}) {
  return (
    <button
      className={clsx(
        "flex items-center justify-center gap-1 rounded-xl font-medium transition-all duration-200 ",
        buttonSizes[size],
        buttonVariants[variant],
        {
          "opacity-50 cursor-not-allowed": loading,
        },
        className,
      )}
      disabled={loading}
      {...props}
    >
      {icon && <IconButton icon={icon} />}
      {loading ? "در حال پردازش" : children}
    </button>
  );
}

export default Button;
