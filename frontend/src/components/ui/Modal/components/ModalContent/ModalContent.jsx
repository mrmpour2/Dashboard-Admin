import { cloneElement, Children, isValidElement, useId } from "react";
import clsx from "clsx";
import ModalHeader from "./components/ModalHeader";
import ModalFooter from "./components/ModalFooter";
import ModalBody from "./components/ModalBody";
import ModalContainer from "../ModalContainer";

function ModalContent({ children, className = "", titleId, descriptionId, ...props }) {
  const generatedTitleId = useId();
  const generatedDescriptionId = useId();
  const resolvedTitleId = titleId || generatedTitleId;
  const resolvedDescriptionId = descriptionId || generatedDescriptionId;

  const enhancedChildren = Children.map(children, (child) => {
    if (!isValidElement(child)) return child;
    if (child.type === ModalHeader) {
      return cloneElement(child, { id: resolvedTitleId });
    }
    if (child.type === ModalBody) {
      return cloneElement(child, { id: resolvedDescriptionId });
    }
    return child;
  });

  return (
    <ModalContainer>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={resolvedTitleId}
        aria-describedby={resolvedDescriptionId}
        className={clsx(
          "relative max-h-[90dvh] w-full overflow-y-auto rounded-xl bg-Surface shadow-2xl",
          className,
        )}
        {...props}
      >
        {enhancedChildren}
      </div>
    </ModalContainer>
  );
}

ModalContent.Header = ModalHeader;
ModalContent.Body = ModalBody;
ModalContent.Footer = ModalFooter;

export default ModalContent;
