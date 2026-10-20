import SearchBox from "./components/SearchBox";
import TitlePage from "./components/TitlePage";
import Notification from "./Notification/Notification";
import UserMenu from "./UserMenu/UserMenu";

function Topbar({ mobileMenuButton }) {
  return (
    <header className="flex min-h-20 items-center justify-between gap-3 border-b border-Border bg-Surface px-4 py-4 sm:px-6 lg:px-8">
      <div className="flex min-w-0 items-center gap-2">
        {mobileMenuButton}
        <TitlePage />
      </div>

      <SearchBox />

      <div className="flex shrink-0 items-center gap-2 sm:gap-4">
        <Notification />
        <UserMenu />
      </div>
    </header>
  );
}

export default Topbar;
