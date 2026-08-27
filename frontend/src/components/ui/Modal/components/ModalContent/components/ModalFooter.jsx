import clsx from "clsx";
import useModal from "../../../context/useModal";

function ModalFooter({ children, className = "", ...props }) {
  return (
    <div
      className={clsx("flex  items-center gap-0.5  text-center ", className)}
      {...props}
    >
      {children}
    </div>
  );
}

export default ModalFooter;
