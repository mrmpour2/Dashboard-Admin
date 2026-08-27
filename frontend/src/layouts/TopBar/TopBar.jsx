import SearchBox from "./components/SearchBox";
import TitlePage from "./components/TitlePage";
import Notification from "./Notification/Notification";
import UserMenu from "./UserMenu/UserMenu";

function Topbar() {
  return (
    <header
      className="
      h-34
      flex
      items-center
      justify-between
      px-10
    "
    >
      <TitlePage />
      <SearchBox />

      <div className="flex items-center gap-4">
        <Notification />
        <UserMenu />
      </div>
    </header>
  );
}

export default Topbar;
