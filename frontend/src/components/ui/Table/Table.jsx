import TableProvider from "./context/TableProvider";
import TableHeader from "./components/TableHeader";
import TableHeadCell from "./components/TableHeadCell";
import TableBody from "./components/TableBody";
import TableRow from "./components/TableRow";
import TableCell from "./components/TableCell";
import TableEmpty from "./components/TableEmpty";
import { tableVariants } from "./components/tableVariant";

function Table({ children, variant = "default" }) {
  return (
    <TableProvider>
      <table className={tableVariants[variant]}>{children}</table>
    </TableProvider>
  );
}

Table.Header = TableHeader;
Table.HeaderCell = TableHeadCell;
Table.Body = TableBody;
Table.Row = TableRow;
Table.Cell = TableCell;
Table.Empty = TableEmpty;

export default Table;
