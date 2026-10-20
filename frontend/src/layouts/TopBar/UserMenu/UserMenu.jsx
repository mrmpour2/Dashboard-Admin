import { User } from "lucide-react";
import { Dropdown } from "../../../components/ui";
import { useAuth } from "../../../auth/useAuth";
import UserButton from "./components/UserButton";
import UserDropdown from "./components/UserDropdown";
import userMenuItems from "./data/userMenuItems";

function UserMenu() {
  const { user, logout, isLoggingOut } = useAuth();
  if (!user) return null;

  const safeUser = {
    name: user.name,
    email: user.email,
    username: user.email,
    role: user.role === "ADMIN" ? "مدیر سیستم" : user.role === "MANAGER" ? "مدیر" : "کارشناس",
    icon: User,
    avatar: user.avatarUrl || undefined,
  };

  const items = userMenuItems.map((item) =>
    item.action === "logout" ? { ...item, onClick: logout, disabled: isLoggingOut } : item,
  );

  return (
    <Dropdown>
      <Dropdown.Trigger>
        <UserButton user={safeUser} />
      </Dropdown.Trigger>
      <Dropdown.Content align="end">
        <UserDropdown userMenuData={items} user={safeUser} />
      </Dropdown.Content>
    </Dropdown>
  );
}

export default UserMenu;
