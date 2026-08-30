import { Link } from "react-router";
import Logo from "./Logo";

function SidebarHeader() {
  return (
    <div className="flex w-full items-center gap-3 px-2 pt-8 pb-6">
      <Logo />
      <Link
        to="/"
        className="flex flex-col leading-tight text-white transition-opacity hover:opacity-90"
      >
        <span className="text-lg font-bold tracking-wide font-Outfit">
          Nebula
        </span>
        <span className="text-xs text-white/60">پنل مدیریت</span>
      </Link>
    </div>
  );
}

export default SidebarHeader;
