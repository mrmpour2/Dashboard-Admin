import clsx from "clsx";

const DialogTitle = ({ className, ...props }) => {
  return (
    <div
      className={clsx(
        "text-lg font-semibold leading-none tracking-tight",
        className,
      )}
      {...props}
    />
  );
};
export default DialogTitle;
