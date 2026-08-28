import usePagination from "../context/usePagination";

function PaginationInfo() {
  const { currentPage, pageSize, totalItems } = usePagination();

  const start = totalItems === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const end = Math.min(currentPage * pageSize, totalItems);

  return (
    <span className="text-sm text-textMuted">
      Showing {start}-{end} of {totalItems}
    </span>
  );
}

export default PaginationInfo;
