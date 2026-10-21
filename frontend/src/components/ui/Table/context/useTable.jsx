import { useContext } from "react";
import TableContext from "./TableContext";

const useTable = () => {
  const context = useContext(TableContext);

  if (!context) {
    throw new Error("Table.* components must be used inside <Table>");
  }

  return context;
};

export default useTable;
