import { useState } from "react";
import FormContext from "./context/FormContetxt";
import FormField from "./components/FormField";
import FormLabel from "./components/FormLabel";
import FormMessage from "./components/FormMessage";
import FormDescription from "./components/FormDescription";
import FormActions from "./components/FormActions";

function Form({ children, onSubmit, className = "" }) {
  const [values, setValues] = useState({});
  const [errors, setErrors] = useState({});

  function handleChange(name, value) {
    setValues((prev) => ({ ...prev, [name]: value }));
  }

  function handleSubmit(e) {
    e.preventDefault();
    onSubmit?.(values);
  }

  return (
    <FormContext.Provider value={{ values, errors, setErrors, handleChange }}>
      <form onSubmit={handleSubmit} className={className}>
        {children}
      </form>
    </FormContext.Provider>
  );
}

Form.Field = FormField;
Form.Label = FormLabel;
Form.Message = FormMessage;
Form.Description = FormDescription;
Form.Actions = FormActions;

export default Form;
