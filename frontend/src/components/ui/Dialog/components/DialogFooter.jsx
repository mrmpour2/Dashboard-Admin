import clsx from "clsx";

function DialogFooter({ className, ...props }) {
  return (
    <div
      className={clsx(
        "flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2",
        className,
      )}
      {...props}
    />
  );
}
export default DialogFooter;
