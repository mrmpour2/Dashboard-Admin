import { useContext } from "react";
import PaginationContext from "./PaginationContext";

const usePagination = () => {
  const context = useContext(PaginationContext);

  if (!context) {
    throw new Error("Pagination.* components must be used inside <Pagination>");
  }

  return context;
};

export default usePagination;
