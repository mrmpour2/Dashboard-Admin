import clsx from "clsx";
import ModalHeader from "./components/ModalHeader";
import ModalFooter from "./components/ModalFooter";
import ModalBody from "./components/ModalBody";
import ModalContainer from "../ModalContainer";

function ModalContent({ children, className = "", ...props }) {
  return (
    <ModalContainer>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        aria-describedby="modal-description"
        className={clsx(
          "relative bg-white rounded-xl w-125 pointer-events-auto z-10",
          className,
        )}
        {...props}
      >
        {children}
      </div>
    </ModalContainer>
  );
}
ModalContent.Header = ModalHeader;
ModalContent.Body = ModalBody;
ModalContent.Footer = ModalFooter;

export default ModalContent;
