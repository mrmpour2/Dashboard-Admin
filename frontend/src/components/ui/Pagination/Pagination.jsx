import PaginationContext from "./context/PaginationContext";
import PaginationPrev from "./components/PaginationPrev";
import PaginationNext from "./components/PaginationNext";
import PaginationPages from "./components/PaginationPages";
import PaginationInfo from "./components/PaginationInfo";

/**
 * Controlled pagination: the consumer owns `currentPage` state and is
 * responsible for slicing their own data with it (same reason Table.Body
 * takes `data` — the state needs to reach code that lives outside this tree).
 *
 * <Pagination
 *   currentPage={page}
 *   totalItems={products.length}
 *   pageSize={10}
 *   onPageChange={setPage}
 * >
 *   <Pagination.Info />
 *   <Pagination.Prev />
 *   <Pagination.Pages />
 *   <Pagination.Next />
 * </Pagination>
 */
function Pagination({
  children,
  currentPage,
  totalItems,
  pageSize,
  onPageChange,
  siblingCount = 1,
}) {
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));

  const value = {
    currentPage,
    totalPages,
    totalItems,
    pageSize,
    onPageChange,
    siblingCount,
  };

  return (
    <PaginationContext.Provider value={value}>
      <nav
        className="flex flex-wrap items-center justify-between gap-3"
        aria-label="Pagination"
      >
        {children}
      </nav>
    </PaginationContext.Provider>
  );
}

Pagination.Prev = PaginationPrev;
Pagination.Next = PaginationNext;
Pagination.Pages = PaginationPages;
Pagination.Info = PaginationInfo;

export default Pagination;
