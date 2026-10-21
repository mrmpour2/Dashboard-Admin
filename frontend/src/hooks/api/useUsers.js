import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { usersApi } from "../../services/api/users";
import { normalizeUser } from "./normalizers";
export function useUsers(params = {}) {
  return useQuery({ queryKey: ["users", params], queryFn: async () => { const result = await usersApi.list(params); return { ...result, items: result.items.map(normalizeUser) }; } });
}
function useWrite(mutationFn) {
  const client = useQueryClient();
  return useMutation({ mutationFn, onSuccess: () => { client.invalidateQueries({ queryKey: ["users"] }); client.invalidateQueries({ queryKey: ["dashboard"] }); } });
}
export function useCreateUser() { return useWrite(usersApi.create); }
export function useUpdateUser() { return useWrite(({ id, payload }) => usersApi.update(id, payload)); }
export function useDeleteUser() { return useWrite(usersApi.remove); }
