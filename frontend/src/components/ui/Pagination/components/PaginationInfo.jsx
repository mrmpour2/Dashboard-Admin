import usePagination from "../context/usePagination";

function PaginationInfo() {
  const { currentPage, pageSize, totalItems } = usePagination();

  const start = totalItems === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const end = Math.min(currentPage * pageSize, totalItems);

  return (
    <span className="text-sm text-textMuted">
      نمایش {start.toLocaleString("fa-IR")} تا {end.toLocaleString("fa-IR")} از {totalItems.toLocaleString("fa-IR")} مورد
    </span>
  );
}

export default PaginationInfo;
