import { X } from "lucide-react";
function CloseBoutton({ onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex justify-center items-center p-2 rounded-full border border-Danger hover:bg-red-100 cursor-pointer"
    >
      <X size={12} color="#E64A19" />
    </button>
  );
}

export default CloseBoutton;
