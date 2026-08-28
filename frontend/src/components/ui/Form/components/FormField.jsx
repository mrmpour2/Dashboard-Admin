import { FormFieldContext } from "../context/FormFieldContext";

function FormField({ name, children }) {
  return (
    <FormFieldContext.Provider value={{ name }}>
      <div className="flex flex-col gap-1.5">{children}</div>
    </FormFieldContext.Provider>
  );
}

export default FormField;
