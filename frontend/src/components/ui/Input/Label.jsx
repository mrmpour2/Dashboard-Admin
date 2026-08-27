function Label({ label, inputID, required }) {
  return (
    <label
      htmlFor={inputID}
      className="absolute left-0.5 top-1 cursor-text peer-focus:text-xs peer-focus:-top-4 transition-all peer-focus:text-primary"
    >
      {label}
      {required && <span className="text-red-500 ml-1">*</span>}
    </label>
  );
}

export default Label;
