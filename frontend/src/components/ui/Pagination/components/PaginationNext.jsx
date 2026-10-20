import usePagination from "../context/usePagination";

const PaginationNext = ({ children = "بعدی", className = "" }) => {
  const { currentPage, totalPages, onPageChange } = usePagination();
  const isDisabled = currentPage >= totalPages;

  return (
    <button
      type="button"
      disabled={isDisabled}
      onClick={() => onPageChange(currentPage + 1)}
      className={`px-3 py-2 rounded border text-sm font-medium transition-colors ${
        isDisabled
          ? "opacity-50 cursor-not-allowed bg-SurfaceMuted text-textSecondary border-Border"
          : "bg-Surface text-textPrimary border-Border hover:bg-SurfaceMuted"
      } ${className}`}
    >
      {children}
    </button>
  );
};

export default PaginationNext;
