import { X } from "lucide-react";

function InputError({ message }) {
  return (
    <div className="flex items-center gap-1 js">
      <X size={12} color="red" />
      <p className=" text-xs text-red-600">{message}</p>
    </div>
  );
}

export default InputError;
