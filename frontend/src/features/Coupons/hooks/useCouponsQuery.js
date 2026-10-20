import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  fetchCoupons,
  createCoupon,
  updateCoupon,
  deleteCoupon,
} from "../../../services/api/couponsApi";

export const couponsKeys = {
  all: ["coupons"],
  list: (params) => [...couponsKeys.all, "list", params],
};

export function useCouponsQuery(params = {}) {
  return useQuery({
    queryKey: couponsKeys.list(params),
    queryFn: () => fetchCoupons(params),
    placeholderData: (previousData) => previousData,
  });
}

export function useCreateCouponMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload) => createCoupon(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: couponsKeys.all });
    },
  });
}

export function useUpdateCouponMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }) => updateCoupon(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: couponsKeys.all });
    },
  });
}

export function useDeleteCouponMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id) => deleteCoupon(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: couponsKeys.all });
    },
  });
}
