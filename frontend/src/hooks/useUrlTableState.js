import { useCallback } from "react";
import { useSearchParams } from "react-router";
import { readTableState } from "./tableStateUtils";

export function useUrlTableState(defaults = {}) {
  const [searchParams, setSearchParams] = useSearchParams();
  const state = readTableState(searchParams, defaults);

  const setState = useCallback((patch) => {
    setSearchParams((current) => {
      const next = new URLSearchParams(current);
      for (const [key, value] of Object.entries(patch)) {
        if (value === undefined || value === null || value === "" || (key === "page" && value === 1)) next.delete(key);
        else next.set(key, String(value));
      }
      return next;
    }, { replace: true });
  }, [setSearchParams]);
  return [state, setState];
}
