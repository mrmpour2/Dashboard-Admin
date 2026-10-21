import clsx from "clsx";
import usePopover from "../context/usePopover";

function PopoverTrigger({ children }) {
  const { setOpen } = usePopover();
  return (
    <button
      onClick={() => setOpen(true)}
      aria-expanded
      type="button"
      aria-haspopup="dialog"
      className={clsx(
        " select-none rounded-Button bg-primary px-6 py-2 text-white text-center align-middle font-Vazir text-xs font-bold uppercase shadow-md shadow-primary/20 transition-all",
      )}
    >
      {children}
    </button>
  );
}

export default PopoverTrigger;
