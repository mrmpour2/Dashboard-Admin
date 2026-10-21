import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  fetchOrders,
  fetchOrder,
  createOrder,
  updateOrderStatus,
} from "../../../services/api/ordersApi";
import { productsKeys } from "../../Products/hooks/useProductsQuery";

export const ordersKeys = {
  all: ["orders"],
  list: (params) => [...ordersKeys.all, "list", params],
  detail: (id) => [...ordersKeys.all, "detail", id],
};

export function useOrdersQuery(params = {}) {
  return useQuery({
    queryKey: ordersKeys.list(params),
    queryFn: () => fetchOrders(params),
    placeholderData: (previousData) => previousData,
  });
}

export function useOrderQuery(id) {
  return useQuery({
    queryKey: ordersKeys.detail(id),
    queryFn: () => fetchOrder(id),
    enabled: Boolean(id),
  });
}

export function useCreateOrderMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload) => createOrder(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      queryClient.invalidateQueries({ queryKey: ordersKeys.all });
      // ثبت سفارش موجودی محصولات را کم می‌کند، پس لیست محصولات هم باید تازه شود
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      queryClient.invalidateQueries({ queryKey: productsKeys.all });
    },
  });
}

export function useUpdateOrderStatusMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }) => updateOrderStatus(id, status),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      queryClient.invalidateQueries({ queryKey: ordersKeys.all });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      queryClient.invalidateQueries({ queryKey: ordersKeys.detail(variables.id) });
      // لغو سفارش موجودی را برمی‌گرداند، پس لیست محصولات هم باید تازه شود
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      queryClient.invalidateQueries({ queryKey: productsKeys.all });
    },
  });
}
