import clsx from "clsx";
import useToast from "../ToastContext/useToast";
import ToastItem from "./ToastItem";
import { toastVariant } from "./ToastVariant";
function ToastContainer({ className = "", ...props }) {
  const { toasts, removeToast } = useToast();

  return (
    <div className="fixed bottom-4 left-4 justify-center z-100 flex flex-col gap-2 pointer-events-none">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          data-slot="toast-content"
          className={clsx(
            "flex h-full items-center gap-3 overflow-hidden p-4 rounded-lg shadow-lg pointer-events-auto animate-in slide-in-from-bottom-4 fade-in duration-300",
            toastVariant[toast.type],
            className,
          )}
          {...props}
        >
          <ToastItem
            icon={toast.type}
            message={toast.message}
            id={toast.id}
            onClose={() => removeToast(toast.id)}
          />
        </div>
      ))}
    </div>
  );
}

export default ToastContainer;
