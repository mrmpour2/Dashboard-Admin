import useTable from "../context/useTable";

function TableRow({ rowId, children }) {
  const { selectedRowIds, toggleRowSelection } = useTable();
  const isSelectable = rowId !== undefined;
  const isSelected = isSelectable && selectedRowIds.has(rowId);

  return (
    <tr
      onClick={isSelectable ? () => toggleRowSelection(rowId) : undefined}
      className={`${isSelected ? "bg-blue-50" : ""} ${
        isSelectable ? "cursor-pointer hover:bg-SurfaceMuted" : ""
      }`}
    >
      {children}
    </tr>
  );
}

export default TableRow;
