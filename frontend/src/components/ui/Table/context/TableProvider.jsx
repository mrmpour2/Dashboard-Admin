import { useCallback, useMemo, useState } from "react";
import TableContext from "./TableContext";

function TableProvider({
  children,
  selectable = false,
  selectedRowIds: controlledSelectedRowIds,
  onSelectionChange,
  sortConfig: controlledSortConfig,
  onSortChange,
}) {
  const [internalSelectedRowIds, setInternalSelectedRowIds] = useState(() => new Set());
  const [rowIds, setRowIds] = useState([]);
  const [globalFilter, setGlobalFilter] = useState("");
  const [internalSortConfig, setInternalSortConfig] = useState({ key: null, direction: null });
  const sortConfig = controlledSortConfig ?? internalSortConfig;

  const selectedRowIds = controlledSelectedRowIds ?? internalSelectedRowIds;

  const setSelection = useCallback(
    (next) => {
      if (controlledSelectedRowIds === undefined) setInternalSelectedRowIds(next);
      onSelectionChange?.(next);
    },
    [controlledSelectedRowIds, onSelectionChange],
  );

  const toggleRowSelection = useCallback(
    (rowId) => {
      if (!selectable) return;
      const next = new Set(selectedRowIds);
      if (next.has(String(rowId))) next.delete(String(rowId));
      else next.add(String(rowId));
      setSelection(next);
    },
    [selectable, selectedRowIds, setSelection],
  );

  const handleSort = useCallback((key) => {
    const next = sortConfig.key !== key ? { key, direction: "asc" } : sortConfig.direction === "asc" ? { key, direction: "desc" } : { key: null, direction: null };
    if (controlledSortConfig !== undefined) onSortChange?.(next);
    else setInternalSortConfig(next);
  }, [controlledSortConfig, onSortChange, sortConfig]);

  const value = useMemo(
    () => ({
      selectable,
      globalFilter,
      setGlobalFilter,
      selectedRowIds,
      setSelection,
      toggleRowSelection,
      rowIds,
      setRowIds,
      sortConfig,
      handleSort,
    }),
    [selectable, globalFilter, selectedRowIds, setSelection, toggleRowSelection, rowIds, sortConfig, handleSort],
  );

  return <TableContext.Provider value={value}>{children}</TableContext.Provider>;
}

export default TableProvider;
