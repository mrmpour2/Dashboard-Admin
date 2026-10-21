import { useContext } from "react";
import ModalContext from "./ModalContext";

function useModal() {
  const context = useContext(ModalContext);
  return context;
}

export default useModal;
