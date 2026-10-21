// TooltipArrow.jsx
import clsx from "clsx";

function TooltipArrow({ className = "" }) {
  return (
    <div
      className={clsx("absolute size-2 rotate-45 bg-inherit", className)}
    ></div>
  );
}

export default TooltipArrow;
