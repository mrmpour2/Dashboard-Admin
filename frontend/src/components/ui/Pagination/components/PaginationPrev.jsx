import usePagination from "../context/usePagination";

function PaginationPrev({ children = "Previous" }) {
  const { currentPage, onPageChange } = usePagination();
  const isDisabled = currentPage <= 1;

  return (
    <button
      type="button"
      onClick={() => onPageChange(currentPage - 1)}
      disabled={isDisabled}
      className="px-3 py-1.5 text-sm rounded-md border border-Border disabled:opacity-40 disabled:cursor-not-allowed hover:bg-SurfaceMuted"
    >
      {children}
    </button>
  );
}

export default PaginationPrev;
