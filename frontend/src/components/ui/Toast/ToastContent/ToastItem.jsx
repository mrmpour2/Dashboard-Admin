import { AlertTriangle, Info, XCircle, CheckCircle2, X } from "lucide-react";
import { useEffect, useState } from "react";
import clsx from "clsx";

function ToastItem({ icon, message, id, onClose }) {
  const [isLeaving, setIsLeaving] = useState(false);

  const handleClose = () => {
    setIsLeaving(true);
    setTimeout(onClose, 200); // مدت زمان باید با duration کلاس زیر هماهنگ باشه
  };

  useEffect(() => {
    const timer = setTimeout(handleClose, 4000);
    return () => clearTimeout(timer);
  }, [id]);

  const toastIcon = {
    Information: Info,
    Warning: AlertTriangle,
    Error: XCircle,
    Success: CheckCircle2,
  };
  const Icon = toastIcon[icon];

  return (
    <div
      className={clsx(
        "flex items-center gap-3 transition-all duration-200 ease-out",
        isLeaving
          ? "opacity-0 translate-x-4 scale-95"
          : "opacity-100 translate-x-0 scale-100 animate-in slide-in-from-bottom-2 fade-in",
      )}
    >
      <span
        data-slot="toast-icon"
        className="shrink-0 pointer-events-none size-4"
      >
        <Icon size={16} />
      </span>
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <p
          data-type={icon}
          data-slot="toast-description"
          id={`toast-desc-${id}`}
          className="text-sm text-muted-foreground"
        >
          {message}
        </p>
      </div>
      <button
        type="button"
        tabIndex="0"
        data-slot="toast-close"
        data-type={icon}
        aria-label="Close toast"
        onClick={handleClose}
        className="group/button inline-flex items-center justify-center border  cursor-pointer border-transparent bg-clip-padding text-sm font-medium whitespace-nowrap transition-all outline-none select-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 active:not-aria-[haspopup]:translate-y-px disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40 [&amp;_svg]:pointer-events-none [&amp;_svg]:shrink-0 [&amp;_svg:not([class*='size-'])]:size-4 hover:bg-muted aria-expanded:bg-muted aria-expanded:text-foreground dark:hover:bg-muted/50 size-7 rounded-[min(var(--radius-md),12px)] in-data-[slot=button-group]:rounded-lg relative shrink-0 text-muted-foreground after:absolute after:-inset-2 after:content-[''] hover:text-foreground"
      >
        <X size={12} />
      </button>
    </div>
  );
}

export default ToastItem;
