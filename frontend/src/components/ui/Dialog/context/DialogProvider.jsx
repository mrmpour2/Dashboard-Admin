import { useRef, useState } from "react";
import DialogContext from "./DialogContext";

function DialogProvider({ children }) {
  const [open, setOpen] = useState(false);
  const toggle = () => {
    setOpen((per) => !per);
  };
  return (
    <DialogContext.Provider value={{ open, setOpen, toggle }}>
      {children}
    </DialogContext.Provider>
  );
}

export default DialogProvider;
