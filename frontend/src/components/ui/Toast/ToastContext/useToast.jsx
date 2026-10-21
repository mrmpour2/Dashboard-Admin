import { useContext } from "react";
import ToastContext from "./ToastContext";

const useToast = () => {
  const context = useContext(ToastContext);
  return context;
};

export default useToast;
