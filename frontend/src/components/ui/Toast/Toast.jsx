import ToastProvider from "./ToastContext/ToastProvider";
import ToastContainer from "./ToastContent/ToastContainer";
import ToastItem from "./ToastContent/ToastItem";

function Toast({ children }) {
  return <ToastProvider>{children}</ToastProvider>;
}
Toast.Container = ToastContainer;
Toast.Item = ToastItem;

export default Toast;
