import usePagination from "../context/usePagination";

const PaginationPrev = ({ children = "قبلی", className = "" }) => {
  const { currentPage, onPageChange } = usePagination();
  const isDisabled = currentPage <= 1;

  return (
    <button
      type="button"
      disabled={isDisabled}
      onClick={() => onPageChange(currentPage - 1)}
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

export default PaginationPrev;
