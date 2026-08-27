import usePagination from "../context/usePagination";

const DOTS = "...";

function getPageRange(currentPage, totalPages, siblingCount) {
  const totalVisible = siblingCount * 2 + 5; // first + last + current + 2 dots

  if (totalPages <= totalVisible) {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }

  const leftSibling = Math.max(currentPage - siblingCount, 1);
  const rightSibling = Math.min(currentPage + siblingCount, totalPages);

  const showLeftDots = leftSibling > 2;
  const showRightDots = rightSibling < totalPages - 1;

  if (!showLeftDots && showRightDots) {
    const leftCount = 3 + siblingCount * 2;
    const leftRange = Array.from({ length: leftCount }, (_, i) => i + 1);
    return [...leftRange, DOTS, totalPages];
  }

  if (showLeftDots && !showRightDots) {
    const rightCount = 3 + siblingCount * 2;
    const rightRange = Array.from(
      { length: rightCount },
      (_, i) => totalPages - rightCount + i + 1
    );
    return [1, DOTS, ...rightRange];
  }

  const middleRange = Array.from(
    { length: rightSibling - leftSibling + 1 },
    (_, i) => leftSibling + i
  );
  return [1, DOTS, ...middleRange, DOTS, totalPages];
}

function PaginationPages() {
  const { currentPage, totalPages, onPageChange, siblingCount } = usePagination();
  const pages = getPageRange(currentPage, totalPages, siblingCount);

  return (
    <div className="flex items-center gap-1">
      {pages.map((page, index) =>
        page === DOTS ? (
          <span key={`dots-${index}`} className="px-2 text-sm text-gray-400">
            {DOTS}
          </span>
        ) : (
          <button
            key={page}
            type="button"
            onClick={() => onPageChange(page)}
            aria-current={page === currentPage ? "page" : undefined}
            className={`px-3 py-1.5 text-sm rounded-md border ${
              page === currentPage
                ? "border-blue-500 bg-blue-50 text-blue-600 font-medium"
                : "border-gray-200 hover:bg-gray-50"
            }`}
          >
            {page}
          </button>
        )
      )}
    </div>
  );
}

export default PaginationPages;
