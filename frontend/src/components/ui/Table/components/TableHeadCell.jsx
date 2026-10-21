import useTable from "../context/useTable";

function TableHeadCell({ children, sortKey, className = "" }) {
  const { sortConfig, handleSort } = useTable();
  const isSorted = Boolean(sortKey && sortConfig.key === sortKey);

  return (
    <th
      scope="col"
      aria-sort={
        sortKey
          ? isSorted
            ? sortConfig.direction === "asc"
              ? "ascending"
              : "descending"
            : "none"
          : undefined
      }
      className={`px-4 py-3 text-start text-xs font-semibold uppercase tracking-wider text-textMuted ${className}`}
    >
      {sortKey ? (
        <button
          type="button"
          onClick={() => handleSort(sortKey)}
          aria-label={`مرتب‌سازی بر اساس ${typeof children === "string" ? children : sortKey}`}
          className="group inline-flex items-center gap-1.5 rounded-md outline-none transition-colors hover:text-textPrimary focus:ring-2 focus:ring-primary/30"
        >
          {children}
          <span
            aria-hidden="true"
            className={`transition-opacity ${
              isSorted
                ? "opacity-100 text-primary"
                : "opacity-40 group-hover:opacity-70"
            }`}
          >
            {isSorted ? (sortConfig.direction === "asc" ? "↑" : "↓") : "↕"}
          </span>
        </button>
      ) : (
        children
      )}
    </th>
  );
}

export default TableHeadCell;
