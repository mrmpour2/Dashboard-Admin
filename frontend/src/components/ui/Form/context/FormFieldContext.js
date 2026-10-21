import { createContext, useContext } from "react";

export const FormFieldContext = createContext(null);

export function useFormField() {
  return useContext(FormFieldContext);
}
