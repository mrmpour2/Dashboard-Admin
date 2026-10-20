import clsx from "clsx";
import CloseButton from "./CloseButton";
import useModal from "../../../context/useModal";

function ModalHeader({ children, className = "", ...props }) {
  const { setOpen } = useModal();

  return (
    <div
      className={clsx(
        "flex items-center justify-between gap-5 px-4 py-6 text-center",
        className,
      )}
      {...props}
    >
      {children}
      <CloseButton onClick={() => setOpen(false)} />
    </div>
  );
}

export default ModalHeader;
