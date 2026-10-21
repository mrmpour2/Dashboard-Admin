import DialogProvider from "./context/DialogProvider";
import DialogContainer from "./components/DialogContainer";
import DialogContent from "./components/DialogContent";
import DialogDescription from "./components/DialogDescription";
import DialogTitle from "./components/DialogTitle";
import DialogHeader from "./components/DialogHeader";
import DialogFooter from "./components/DialogFooter";

function Dialog({ children }) {
  return <DialogProvider>{children}</DialogProvider>;
}
Dialog.Container = DialogContainer;
Dialog.Header = DialogHeader;
Dialog.Title = DialogTitle;
Dialog.Content = DialogContent;
Dialog.Description = DialogDescription;
Dialog.Footer = DialogFooter;
export default Dialog;
