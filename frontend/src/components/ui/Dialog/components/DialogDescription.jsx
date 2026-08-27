import clsx from "clsx";

const DialogDescription = ({ className, ...props }) => (
  <div className={clsx("text-sm text-gray-500", className)} {...props} />
);
export default DialogDescription;
