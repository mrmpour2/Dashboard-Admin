import usePagination from "../context/usePagination";

function PaginationNext({ children = "Next" }) {
  const { currentPage, totalPages, onPageChange } = usePagination();
  const isDisabled = currentPage >= totalPages;

  return (
    <button
      type="button"
      onClick={() => onPageChange(currentPage + 1)}
      disabled={isDisabled}
      className="px-3 py-1.5 text-sm rounded-md border border-gray-200 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-50"
    >
      {children}
    </button>
  );
}

export default PaginationNext;
