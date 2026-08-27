import { useState } from "react";
import TableContext from "./TableContext";

function TableProvider({ children }) {
  const [selectedRowIds, setSelectedRowIds] = useState(new Set());
  const [sortConfig, setSortConfig] = useState({ key: null, direction: null });

  const toggleRowSelection = (rowId) => {
    setSelectedRowIds((prev) => {
      const next = new Set(prev);
      if (next.has(rowId)) {
        next.delete(rowId);
      } else {
        next.add(rowId);
      }
      return next;
    });
  };

  const handleSort = (key) => {
    setSortConfig((prev) => {
      if (prev.key !== key) return { key, direction: "asc" };
      if (prev.direction === "asc") return { key, direction: "desc" };
      return { key: null, direction: null };
    });
  };

  const value = {
    selectedRowIds,
    toggleRowSelection,
    sortConfig,
    handleSort,
  };

  return <TableContext.Provider value={value}>{children}</TableContext.Provider>;
}

export default TableProvider;
