import TableProvider from "./context/TableProvider";
import TableHeader from "./components/TableHeader";
import TableHeadCell from "./components/TableHeadCell";
import TableBody from "./components/TableBody";
import TableRow from "./components/TableRow";
import TableCell from "./components/TableCell";
import TableEmpty from "./components/TableEmpty";
import TableFilter from "./components/TableFilter";
import TableSelectAll from "./components/TableSelectAll";
import TableSearch from "./components/TableSearch";
import { tableVariants } from "./components/tableVariant";

function Table({
  children,
  variant = "default",
  selectable = false,
  selectedRowIds,
  onSelectionChange,
  sortConfig,
  onSortChange,
  className = "",
  toolbar,
  minWidth = "min-w-[800px]",
  ...props
}) {
  return (
    <TableProvider
      selectable={selectable}
      selectedRowIds={selectedRowIds}
      onSelectionChange={onSelectionChange}
      sortConfig={sortConfig}
      onSortChange={onSortChange}
    >
      {toolbar ? (
        <div className="border-b border-Border p-4">{toolbar}</div>
      ) : null}
      <div className="w-full overflow-x-auto rounded-xl border border-Border bg-Surface">
        <table
          {...props}
          className={`${tableVariants[variant] ?? tableVariants.default} ${minWidth} ${className}`}
        >
          {children}
        </table>
      </div>
    </TableProvider>
  );
}

Table.Header = TableHeader;
Table.HeaderCell = TableHeadCell;
Table.Body = TableBody;
Table.Row = TableRow;
Table.Cell = TableCell;
Table.Empty = TableEmpty;
Table.Filter = TableFilter;
Table.SelectAll = TableSelectAll;
Table.Search = TableSearch;

export default Table;
