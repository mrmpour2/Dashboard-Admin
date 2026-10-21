function Label({ label, inputID, required }) {
  return (
    <label
      htmlFor={inputID}
      className="
        absolute left-0.5 top-1 cursor-text 
        transition-all 
        peer-focus:text-xs peer-focus:-top-4 peer-focus:text-primary
        peer-not-placeholder-shown:text-xs peer-not-placeholder-shown:-top-4 peer-not-placeholder-shown:text-primary
      "
    >
      {label}
      {required && <span className="text-red-500 ml-1">*</span>}
    </label>
  );
}

export default Label;
