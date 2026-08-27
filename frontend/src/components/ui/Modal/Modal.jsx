import ModalProvider from "./context/ModalProvider";
import ModalContent from "./components/ModalContent/ModalContent";
import ModalTrigger from "./components/ModalTrigger/ModalTrigger";
function Modal({ children }) {
  return <ModalProvider>{children}</ModalProvider>;
}
Modal.Content = ModalContent;
Modal.Trigger = ModalTrigger;

export default Modal;
