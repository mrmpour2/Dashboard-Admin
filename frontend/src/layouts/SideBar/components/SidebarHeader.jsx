import { Link } from "react-router";
import Logo from "./Logo";

function SidebarHeader() {
  return (
    <div className="w-full h-17.5 flex justify-center items-center gap-1 mt-4 p-15 -space-x-9">
      <Logo />
      <div>
        <Link
          to={"/"}
          className="text-xl font-bold tracking-wide font-Outfit text-white "
        >
          MR.MPOUR
        </Link>
      </div>
    </div>
  );
}

export default SidebarHeader;
