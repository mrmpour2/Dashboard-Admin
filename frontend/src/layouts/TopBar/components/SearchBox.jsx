import { Search, X } from "lucide-react";
import { useSearchParams } from "react-router";
import { Input } from "../../../components/ui";

function SearchBox() {
  const [searchParams, setSearchParams] = useSearchParams();
  const search = searchParams.get("search") || "";

  const searchHandle = (event) => {
    const value = event.target.value;
    const next = new URLSearchParams(searchParams);
    if (value) {
      next.set("search", value);
    } else {
      next.delete("search");
    }
    setSearchParams(next);
  };

  return (
    <form
      role="search"
      onSubmit={(e) => e.preventDefault()}
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
        transition-smooth
        focus-within:ring-2
        focus-within:ring-primary/40
      "
    >
      <Input
        type="search"
        name="q"
        value={search}
        onChange={searchHandle}
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
      {search && (
        <button
          type="button"
          onClick={() => searchHandle({ target: { value: "" } })}
          aria-label="پاک کردن جستجو"
          className="text-primary/60 hover:text-primary transition-colors"
        >
          <X size={16} />
        </button>
      )}
    </form>
  );
}

export default SearchBox;
