import { Children, isValidElement, useEffect, useMemo } from "react";
import useTable from "../context/useTable";

function compareValues(a, b) {
  const left = a ?? "";
  const right = b ?? "";
  if (typeof left === "number" && typeof right === "number") return left - right;
  return String(left).localeCompare(String(right), "fa", {
    numeric: true,
    sensitivity: "base",
  });
}

function TableBody({ children, filter = "", filterKeys = [] }) {
  const { sortConfig, selectable, setRowIds } = useTable();
  const rows = useMemo(
    () => Children.toArray(children).filter(isValidElement),
    [children],
  );
  const normalizedFilter = String(filter).trim().toLocaleLowerCase("fa");

  const sortedRows = useMemo(() => {
    const filteredRows = normalizedFilter
      ? rows.filter((row) => {
          const data = row.props.data ?? {};
          const values = filterKeys.length
            ? filterKeys.map((key) => data[key])
            : Object.values(data);

          return values.some((value) =>
            String(value ?? "")
              .toLocaleLowerCase("fa")
              .includes(normalizedFilter),
          );
        })
      : rows;

    return [...filteredRows].sort((a, b) => {
      if (!sortConfig.key) return 0;
      const result = compareValues(
        a.props.data?.[sortConfig.key],
        b.props.data?.[sortConfig.key],
      );
      return sortConfig.direction === "desc" ? -result : result;
    });
  }, [filterKeys, normalizedFilter, rows, sortConfig]);

  const visibleRowIds = useMemo(
    () =>
      sortedRows
        .map((row) => row.props.rowId)
        .filter((id) => id !== undefined && id !== null)
        .map(String),
    [sortedRows],
  );

  useEffect(() => {
    if (selectable) setRowIds(visibleRowIds);
  }, [selectable, setRowIds, visibleRowIds]);

  return <tbody className="divide-y divide-Border">{sortedRows}</tbody>;
}

export default TableBody;
