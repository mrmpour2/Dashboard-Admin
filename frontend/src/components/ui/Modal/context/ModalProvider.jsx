import { useState } from "react";
import ModalContext from "./ModalContext";

function ModalProvider({ children }) {
  const [open, setOpen] = useState(false);
  const toggle = () => {
    setOpen((per) => !per);
  };

  return (
    <ModalContext.Provider value={{ open, setOpen, toggle }}>
      {children}
    </ModalContext.Provider>
  );
}

export default ModalProvider;
