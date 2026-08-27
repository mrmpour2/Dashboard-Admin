import { createContext, useContext } from "react";

const FormFieldContext = createContext(null);

function FormField({ name, children }) {
  return (
    <FormFieldContext.Provider value={{ name }}>
      <div className="flex flex-col gap-1.5">{children}</div>
    </FormFieldContext.Provider>
  );
}

export function useFormField() {
  return useContext(FormFieldContext);
}

export default FormField;
