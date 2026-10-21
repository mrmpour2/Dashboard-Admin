import { X } from "lucide-react";

function CloseButton({ onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="بستن"
      className="flex items-center justify-center rounded-full border border-Danger p-2 transition hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-primary/30"
    >
      <X aria-hidden="true" size={12} />
    </button>
  );
}

export default CloseButton;
