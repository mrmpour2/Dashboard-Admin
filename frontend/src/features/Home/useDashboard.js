import { useQuery } from "@tanstack/react-query";
import api from "../../services/axios";
export function useDashboard() {
  return useQuery({ queryKey: ["dashboard"], queryFn: () => api.get("/dashboard").then(({ data }) => data) });
}
