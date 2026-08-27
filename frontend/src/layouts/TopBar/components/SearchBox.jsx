import { Search } from "lucide-react";
import { useSearchParams } from "react-router";
import { Input } from "../../../components/ui";

function SearchBox() {
  const [searchParams, setSearchParams] = useSearchParams();
  const search = searchParams.get("search") || "";
  const searchHandle = (event) => {
    const value = event.target.value;
    if (value) {
      setSearchParams({
        search: value,
      });
    } else {
      setSearchParams({});
    }
  };
  return (
    <form
      role="search"
      className="
        hidden
        sm:flex
        items-center
        w-103
        h-11
        bg-primary/10
        rounded-2xl
        px-4
        shadow-sm
      "
    >
      <Input
        type="search"
        name="q"
        placeholder="جستجو کنید..."
        autoComplete="off"
        className="
          w-full
          h-full
          bg-transparent
          text-primary
          border-0
          outline-none
          focus:border-transparent
           focus:border-0
          placeholder:text-primary/80
        "
        icon={<Search size={20} className="flex-1 text-primary" />}
      />
    </form>
  );
}

export default SearchBox;
