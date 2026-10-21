import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { productsApi } from "../../services/api/products";
import { normalizeProduct } from "./normalizers";
export function useProducts(params = {}) {
  return useQuery({ queryKey: ["products", params], queryFn: async () => { const result = await productsApi.list(params); return { ...result, items: result.items.map(normalizeProduct) }; } });
}
function useWrite(mutationFn) {
  const client = useQueryClient();
  return useMutation({ mutationFn, onSuccess: () => { client.invalidateQueries({ queryKey: ["products"] }); client.invalidateQueries({ queryKey: ["dashboard"] }); } });
}
export function useCreateProduct() { return useWrite(productsApi.create); }
export function useUpdateProduct() { return useWrite(({ id, payload }) => productsApi.update(id, payload)); }
export function useDeleteProduct() { return useWrite(productsApi.remove); }
