import { useMemo } from "react";
import useTable from "../context/useTable";

function getValue(row, key) {
  const value = row?.[key];
  return value === null || value === undefined ? "" : value;
}

function compareValues(a, b) {
  if (typeof a === "number" && typeof b === "number") return a - b;
  return String(a).localeCompare(String(b), "fa", { numeric: true, sensitivity: "base" });
}

/**
 * دیتای واقعی جدول را بر اساس وضعیت مرتب‌سازی و جستجوی سراسری Table
 * (که در TableProvider نگه‌داری می‌شود) پردازش می‌کند.
 *
 * @param {Array<object>} data - آرایه خام دیتا
 * @param {object} options
 * @param {string[]} options.searchableFields - فیلدهایی که جستجوی سراسری روی آن‌ها اعمال می‌شود
 */
function useTableData(data, { searchableFields = [] } = {}) {
  const { sortConfig, globalFilter } = useTable();

  return useMemo(() => {
    let result = Array.isArray(data) ? [...data] : [];

    // --- فیلتر واقعی: جستجوی سراسری روی فیلدهای مشخص‌شده ---
    const query = globalFilter.trim().toLowerCase();
    if (query && searchableFields.length > 0) {
      result = result.filter((row) =>
        searchableFields.some((field) =>
          String(getValue(row, field)).toLowerCase().includes(query),
        ),
      );
    }

    // --- مرتب‌سازی واقعی ---
    if (sortConfig.key) {
      const { key, direction } = sortConfig;
      result.sort((a, b) => {
        const cmp = compareValues(getValue(a, key), getValue(b, key));
        return direction === "asc" ? cmp : -cmp;
      });
    }

    return result;
  }, [data, sortConfig, globalFilter, searchableFields]);
}

export default useTableData;
