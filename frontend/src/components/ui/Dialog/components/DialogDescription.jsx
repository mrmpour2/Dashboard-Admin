import clsx from "clsx";

const DialogDescription = ({ className, ...props }) => (
  <div className={clsx("text-sm text-textMuted", className)} {...props} />
);
export default DialogDescription;
