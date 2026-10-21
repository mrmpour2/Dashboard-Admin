import clsx from "clsx";

function DialogHeader({ className, ...props }) {
  return (
    <div
      className={clsx(
        "flex flex-col space-y-1.5 text-center sm:text-left",
        className,
      )}
      {...props}
    />
  );
}
export default DialogHeader;
