import useTable from "../context/useTable";

function TableSelectAll({ label = "انتخاب همه ردیف‌ها" }) {
  const { rowIds, selectedRowIds, setSelection } = useTable();
  const allSelected = rowIds.length > 0 && rowIds.every((id) => selectedRowIds.has(String(id)));
  const someSelected = rowIds.some((id) => selectedRowIds.has(String(id)));

  return <input type="checkbox" checked={allSelected} aria-label={label} ref={(node) => { if (node) node.indeterminate = someSelected && !allSelected; }} onChange={(event) => { const next = new Set(selectedRowIds); rowIds.forEach((id) => event.target.checked ? next.add(String(id)) : next.delete(String(id))); setSelection(next); }} className="size-4 accent-primary" />;
}
export default TableSelectAll;
