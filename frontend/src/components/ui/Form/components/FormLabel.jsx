import { useFormField } from "../context/FormFieldContext";

function FormLabel({ children }) {
  const { name } = useFormField();
  return (
    <label htmlFor={name} className="text-sm font-medium">
      {children}
    </label>
  );
}

export default FormLabel;
