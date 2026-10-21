import PaginationContext from "./context/PaginationContext";
import PaginationPrev from "./components/PaginationPrev";
import PaginationNext from "./components/PaginationNext";
import PaginationPages from "./components/PaginationPages";
import PaginationInfo from "./components/PaginationInfo";

const Pagination = ({
  currentPage = 1,
  totalItems = 0,
  pageSize = 10,
  onPageChange = () => {},
  siblingCount = 1,
  children,
  className = "",
}) => {
  const safePageSize = Math.max(1, Number(pageSize) || 1);
  const safeTotalItems = Math.max(0, Number(totalItems) || 0);
  const safeSiblingCount = Math.max(0, Number(siblingCount) || 0);

  const totalPages = Math.max(1, Math.ceil(safeTotalItems / safePageSize));
  const safeCurrentPage = Math.min(Math.max(1, Number(currentPage) || 1), totalPages);

  const value = {
    currentPage: safeCurrentPage,
    totalPages,
    totalItems: safeTotalItems,
    pageSize: safePageSize,
    siblingCount: safeSiblingCount,
    onPageChange,
  };

  return (
    <PaginationContext.Provider value={value}>
      <nav
        aria-label="صفحه‌بندی"
        className={`flex flex-wrap items-center justify-between gap-3 ${className}`}
      >
        {children}
      </nav>
    </PaginationContext.Provider>
  );
};

Pagination.Prev = PaginationPrev;
Pagination.Next = PaginationNext;
Pagination.Pages = PaginationPages;
Pagination.Info = PaginationInfo;

export default Pagination;
