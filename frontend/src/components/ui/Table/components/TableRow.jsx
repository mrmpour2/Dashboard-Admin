import useTable from "../context/useTable";

function TableRow({ rowId, children }) {
  const { selectable, selectedRowIds, toggleRowSelection } = useTable();
  const isSelectable = selectable && rowId !== undefined;
  const isSelected = isSelectable && selectedRowIds.has(String(rowId));

  return (
    <tr
      data-table-row-id={isSelectable ? String(rowId) : undefined}
      aria-selected={isSelectable ? isSelected : undefined}
      className={`group transition-colors ${
        isSelected
          ? "bg-primary/10 hover:bg-primary/15"
          : "hover:bg-SurfaceMuted/40"
      }`}
    >
      {selectable && (
        <td
          className="w-12 px-4 py-2"
          onClick={(event) => event.stopPropagation()}
        >
          <input
            type="checkbox"
            checked={isSelected}
            onChange={() => toggleRowSelection(String(rowId))}
            disabled={!isSelectable}
            aria-label={`انتخاب ردیف ${rowId ?? ""}`}
            className="size-4 cursor-pointer accent-primary"
          />
        </td>
      )}
      {children}
    </tr>
  );
}

export default TableRow;
