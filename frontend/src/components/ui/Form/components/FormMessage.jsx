import useForm from "../context/useForm";
import { useFormField } from "../context/FormFieldContext";

function FormMessage() {
  const { errors } = useForm();
  const { name } = useFormField();
  const message = errors?.[name];

  if (!message) return null;

  return <p className="text-sm text-red-500">{message}</p>;
}

export default FormMessage;
