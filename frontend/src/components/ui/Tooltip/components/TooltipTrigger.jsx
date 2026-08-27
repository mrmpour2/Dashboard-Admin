import clsx from "clsx";
import useTooltip from "../context/useTooltip";

function TooltipTrigger({ children }) {
  const { setOpen } = useTooltip();
  const handleMouseEnter = () => {
    setOpen(true);
  };

  const handleMouseLeave = () => {
    setOpen(false);
  };

  const handleFocus = () => {
    setOpen(true);
  };

  const handleBlur = () => {
    setOpen(false);
  };
  return (
    <button
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onFocus={handleFocus}
      onBlur={handleBlur}
      type="button"
      className={clsx(
        " select-none rounded-Button bg-primary px-6 py-2 text-white text-center align-middle font-Vazir text-xs font-bold uppercase shadow-md shadow-primary/20 transition-all",
      )}
    >
      {children}
    </button>
  );
}

export default TooltipTrigger;
