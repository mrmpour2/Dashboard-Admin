import usePagination from "../context/usePagination";

const DOTS = "...";

const range = (start, end) => {
  const length = end - start + 1;
  return Array.from({ length }, (_, index) => start + index);
};

const getPageRange = ({ totalPages, currentPage, siblingCount }) => {
  const totalVisible = siblingCount * 2 + 5;

  if (totalPages <= totalVisible) {
    return range(1, totalPages);
  }

  const leftSibling = Math.max(currentPage - siblingCount, 1);
  const rightSibling = Math.min(currentPage + siblingCount, totalPages);

  const showLeftDots = leftSibling > 2;
  const showRightDots = rightSibling < totalPages - 1;

  if (!showLeftDots && showRightDots) {
    const leftCount = 3 + siblingCount * 2;
    return [...range(1, leftCount), DOTS, totalPages];
  }

  if (showLeftDots && !showRightDots) {
    const rightCount = 3 + siblingCount * 2;
    return [1, DOTS, ...range(totalPages - rightCount + 1, totalPages)];
  }

  return [1, DOTS, ...range(leftSibling, rightSibling), DOTS, totalPages];
};

const PaginationPages = ({ className = "" }) => {
  const { currentPage, totalPages, siblingCount, onPageChange } = usePagination();

  const pages = getPageRange({ totalPages, currentPage, siblingCount });

  return (
    <ul className={`flex items-center gap-1 ${className}`}>
      {pages.map((page, index) => {
        if (page === DOTS) {
          return (
            <li key={`dots-${index}`} className="px-3 py-2 text-gray-400 select-none">
              {DOTS}
            </li>
          );
        }

        const isActive = page === currentPage;

        return (
          <li key={page}>
            <button
              type="button"
              onClick={() => onPageChange(page)}
              aria-current={isActive ? "page" : undefined}
              className={`px-3 py-2 rounded border text-sm font-medium transition-colors ${
                isActive
                  ? "bg-primary text-white border-primary"
                  : "bg-Surface text-textPrimary border-Border hover:bg-SurfaceMuted"
              }`}
            >
              {page.toLocaleString("fa-IR")}
            </button>
          </li>
        );
      })}
    </ul>
  );
};

export default PaginationPages;
