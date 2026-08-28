import SignInButton from "../Auth/SignInButton";
import UserButton from "./components/UserButton";
import UserDropdown from "./components/UserDropdown";
import userMenuItems from "./data/userMenuItems";
import { User } from "lucide-react";
import { Dropdown } from "../../../components/ui";
function UserMenu() {
  const isLogin = true;
  const user = {
    name: "محمدرضا محمدی پور",
    email: "mr.mpour2@gimail.com",
    username: "MR.MPOUR",
    icon: User,
    role: "مدیر سیستم",
    avatar: "/images/12546.png",
  };

  return (
    <Dropdown>
      {isLogin ? (
        <Dropdown.Trigger>
          <UserButton user={user} />
        </Dropdown.Trigger>
      ) : (
        <SignInButton />
      )}

      <Dropdown.Content align="end">
        <UserDropdown userMenuData={userMenuItems} user={user} />
      </Dropdown.Content>
    </Dropdown>
  );
}

export default UserMenu;
