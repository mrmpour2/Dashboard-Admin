import { useContext } from "react";
import FormContext from "./FormContetxt";

function useForm() {
  const context = useContext(FormContext);
  return context;
}

export default useForm;
