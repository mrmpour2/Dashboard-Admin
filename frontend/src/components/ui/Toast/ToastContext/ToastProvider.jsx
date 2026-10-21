import { useState } from "react";
import ToastContext from "./ToastContext";
function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const addToast = (message, type) => {
    setToasts((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        message,
        type,
      },
    ]);
  };
  const removeToast = (id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };
  const toast = {
    Success: (message) => addToast(message, "Success"),

    Error: (message) => addToast(message, "Error"),

    Warning: (message) => addToast(message, "Warning"),

    Information: (message) => addToast(message, "Information"),
  };
  return (
    <ToastContext.Provider value={{ toasts, toast, addToast, removeToast }}>
      {children}
    </ToastContext.Provider>
  );
}

export default ToastProvider;
