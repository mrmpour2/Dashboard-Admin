import { cn } from "@/lib/utils";

function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
  ...props
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-Border px-6 py-12 text-center",
        className,
      )}
      {...props}
    >
      {Icon && (
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-SurfaceMuted text-textMuted">
          <Icon className="h-6 w-6" />
        </div>
      )}

      {title && <h3 className="text-sm font-medium text-textPrimary">{title}</h3>}

      {description && (
        <p className="max-w-sm text-sm text-textMuted">{description}</p>
      )}

      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}

export default EmptyState;
