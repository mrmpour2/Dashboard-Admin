import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchUsers, updateUser, deleteUser } from "../../../services/api/usersApi";

export const usersKeys = {
  all: ["users"],
  list: (params) => [...usersKeys.all, "list", params],
};

export function useUsersQuery(params = {}) {
  return useQuery({
    queryKey: usersKeys.list(params),
    queryFn: () => fetchUsers(params),
    // داده قبلی حین بارگذاری صفحه بعدی نگه داشته می‌شود تا UI پرش نکند
    placeholderData: (previousData) => previousData,
  });
}

export function useUpdateUserMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }) => updateUser(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: usersKeys.all });
    },
  });
}

export function useDeleteUserMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id) => deleteUser(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: usersKeys.all });
    },
  });
}
