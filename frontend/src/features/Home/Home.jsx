import { Form, useForm, Input } from "../../components/ui";

// چون Input خودت value/onChange خامی نمی‌گیره از بیرون به‌صورت مستقیم،
// یه wrapper کوچیک می‌سازیم که وصلش می‌کنه به state فرم
function ConnectedInput({ name, ...props }) {
  const { values, handleChange } = useForm();
  return (
    <Input
      {...props}
      value={values[name] || ""}
      onChange={(e) => handleChange(name, e.target.value)}
    />
  );
}

function Home() {
  function handleSubmit(values) {
    console.log("مقادیر ارسال‌شده:", values);
  }

  return (
    <Form onSubmit={handleSubmit} className="flex flex-col gap-4 max-w-sm">
      <Form.Field name="email">
        <ConnectedInput
          name="email"
          type="email"
          label="ایمیل"
          placeholder="you@example.com"
        />
      </Form.Field>

      <Form.Field name="password">
        <ConnectedInput
          name="password"
          type="password"
          label="رمز عبور"
          placeholder="••••••••"
        />
      </Form.Field>

      <Form.Actions>
        <button
          type="submit"
          className="bg-primary text-white px-4 py-2 rounded"
        >
          ورود
        </button>
      </Form.Actions>
    </Form>
  );
}

export default Home;
