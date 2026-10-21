import { useQuery } from "@tanstack/react-query";
import { authApi } from "../../services/api/auth";
export function useCurrentUser(){return useQuery({queryKey:["auth","me"],queryFn:authApi.me,retry:false,staleTime:5*60_000})}
