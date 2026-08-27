import clsx from "clsx";
import useModal from "../../context/useModal";
function ModalTrigger({ children, className = "", ...props }) {
  const { open, toggle } = useModal();
  return (
    <div
      onClick={toggle}
      aria-expanded={open}
      aria-haspopup="dialog"
      className={clsx(className)}
      {...props}
    >
      {children}
    </div>
  );
}

export default ModalTrigger;
