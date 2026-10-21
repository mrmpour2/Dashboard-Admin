import clsx from "clsx";
import useDialog from "../context/useDialog";

function DialogOverlay({ className, ...props }) {
  const { open, setOpen } = useDialog(); 
  return (
    <div
      onClick={() => setOpen(false)}
      data-state={open ? "open" : "closed"} 
      className={clsx(
        "fixed inset-0 z-50 bg-black/80",
        "data-[state=open]:animate-in data-[state=open]:fade-in-0",
        "data-[state=closed]:animate-out data-[state=closed]:fade-out-0",
        className,
      )}
      {...props}
    />
  );
}

export default DialogOverlay;
