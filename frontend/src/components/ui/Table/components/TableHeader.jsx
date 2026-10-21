import useTable from "../context/useTable";

function TableHeader({ children }) {
  const { selectable, selectedRowIds, rowIds, setSelection } = useTable();
  const allSelected =
    rowIds.length > 0 && rowIds.every((id) => selectedRowIds.has(id));
  const someSelected = rowIds.some((id) => selectedRowIds.has(id));

  const toggleAll = (checked) => {
    const next = new Set(selectedRowIds);
    rowIds.forEach((id) => (checked ? next.add(id) : next.delete(id)));
    setSelection(next);
  };

  return (
    <thead className="border-b border-Border bg-SurfaceMuted/50">
      <tr>
        {selectable && (
          <th scope="col" className="w-12 px-4 py-3">
            <input
              type="checkbox"
              checked={allSelected}
              ref={(node) => {
                if (node) node.indeterminate = someSelected && !allSelected;
              }}
              onChange={(event) => toggleAll(event.target.checked)}
              aria-label="انتخاب همه ردیف‌ها"
              className="size-4 cursor-pointer accent-primary"
            />
          </th>
        )}
        {children}
      </tr>
    </thead>
  );
}

export default TableHeader;
