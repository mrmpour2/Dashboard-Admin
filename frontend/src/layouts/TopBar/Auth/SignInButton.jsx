import { NavLink } from "react-router";

function SignInButton() {
  return (
    <button className="flex justify-center items-center divide-x divide-primary/30  bg-primary/10 px-3 py-2 rounded-2xl font-medium gap-x-2 flex-1  ">
      <NavLink to={"/"} className="px-2">
        ورود
      </NavLink>
      <NavLink to={"/"} className="px-1">
        ثبت نام
      </NavLink>
    </button>
  );
}

export default SignInButton;
