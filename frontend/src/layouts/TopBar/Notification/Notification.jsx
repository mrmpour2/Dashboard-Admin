import NotificationButton from "./components/NotificationButton";
import NotificationDropdown from "./components/NotificationDropdown";
import notificationsData from "./data/NotificationData";
import useClickOutside from "../../../hooks/useClickOutside";
import useEscapeKey from "../../../hooks/useEscapeKey";
import { Dropdown } from "../../../components/ui";
function Notification() {
  const unreadCount = notificationsData.filter((item) => !item.isRead).length;
  return (
    <Dropdown className="relative">
      <Dropdown.Trigger>
        <NotificationButton count={unreadCount} />
      </Dropdown.Trigger>

      <Dropdown.Content>
        <NotificationDropdown
          notifications={notificationsData}
          count={unreadCount}
        />
      </Dropdown.Content>
    </Dropdown>
  );
}

export default Notification;
