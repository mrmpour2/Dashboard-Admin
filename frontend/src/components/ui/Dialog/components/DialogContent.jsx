import clsx from "clsx";
import { X } from "lucide-react";
import useDialog from "../context/useDialog";

const DialogContent = ({ className, children, ...props }) => {
  const { setOpen } = useDialog();
  return (
    <div
      className={clsx(
        "fixed left-1/2 top-1/2 z-50 grid w-full max-w-lg -translate-x-1/2 -translate-y-1/2",
        "gap-4 rounded-lg border bg-white p-6 shadow-lg duration-200",
        "data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95",
        "data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95",
        "pointer-events-auto",
        className,
      )}
      {...props}
    >
      {children}
      <button
        onClick={() => setOpen(false)}
        className="absolute right-4 top-4 rounded-sm opacity-70 transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-2 disabled:pointer-events-none"
      >
        <X className="h-4 w-4" />
        <span className="sr-only">Close</span>
      </button>
    </div>
  );
};
export default DialogContent;
