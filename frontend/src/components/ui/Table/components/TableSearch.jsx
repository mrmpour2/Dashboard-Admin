import { Search, X } from "lucide-react";
import useTable from "../context/useTable";

function TableSearch({ placeholder = "جستجو..." }) {
  const { globalFilter, setGlobalFilter } = useTable();

  return (
    <div className="relative w-full max-w-xs">
      <Search
        size={16}
        className="pointer-events-none absolute start-3 top-1/2 -translate-y-1/2 text-textMuted"
      />
      <input
        type="search"
        value={globalFilter}
        onChange={(e) => setGlobalFilter(e.target.value)}
        placeholder={placeholder}
        aria-label={placeholder}
        className="h-10 w-full rounded-xl border border-Border bg-Surface ps-9 pe-8 text-sm text-textPrimary outline-none transition-smooth focus:ring-2 focus:ring-primary/40"
      />
      {globalFilter && (
        <button
          type="button"
          onClick={() => setGlobalFilter("")}
          aria-label="پاک کردن جستجو"
          className="absolute end-2.5 top-1/2 -translate-y-1/2 text-textMuted hover:text-textPrimary"
        >
          <X size={14} />
        </button>
      )}
    </div>
  );
}

export default TableSearch;
