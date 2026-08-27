import clsx from "clsx";

function ModalBody({ children, className = "", ...props }) {
  return (
    <div
      className={clsx(
        "flex flex-col items-center gap-0.5 px-4 py-6  ",
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export default ModalBody;
