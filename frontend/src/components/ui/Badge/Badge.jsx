import clsx from "clsx";
import IconBadge from "./icon/IconBadge";
import badgeVariants from "./badgeVariants";

function Badge({
  variant = "brand",
  children,
  className = "",
  icon,
  ...props
}) {
  return (
    <span
      className={clsx(
        "inline-flex items-center font-Vazir text-xs font-medium px-1.5 py-0.5 rounded-Button gap-1",
        badgeVariants[variant],
        className,
      )}
      {...props}
    >
      {icon && <IconBadge icon={icon} />}
      {children}
    </span>
  );
}

export default Badge;
