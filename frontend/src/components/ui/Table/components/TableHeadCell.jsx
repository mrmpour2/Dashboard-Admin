import useTable from "../context/useTable";

function TableHeadCell({ children, sortKey }) {
  const { sortConfig, handleSort } = useTable();
  const isSorted = sortKey && sortConfig.key === sortKey;

  return (
    <th
      onClick={sortKey ? () => handleSort(sortKey) : undefined}
      className={`px-4 py-2 text-left font-medium text-textSecondary ${
        sortKey ? "cursor-pointer select-none" : ""
      }`}
    >
      <span className="inline-flex items-center gap-1">
        {children}
        {isSorted && <span>{sortConfig.direction === "asc" ? "↑" : "↓"}</span>}
      </span>
    </th>
  );
}

export default TableHeadCell;
