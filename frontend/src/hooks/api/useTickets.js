import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ticketsApi } from "../../services/api/tickets";
import { normalizeTicket } from "./normalizers";
export function useTickets(params = {}) {
  return useQuery({ queryKey: ["tickets", params], queryFn: async () => { const result = await ticketsApi.list(params); return { ...result, items: result.items.map(normalizeTicket) }; } });
}
export function useTicket(id) {
  return useQuery({ queryKey: ["tickets", id], enabled: Boolean(id), queryFn: async () => { const result = await ticketsApi.get(id); return { ...normalizeTicket(result), description: result.description, comments: result.comments }; } });
}
function useWrite(mutationFn) {
  const client = useQueryClient();
  return useMutation({ mutationFn, onSuccess: () => { client.invalidateQueries({ queryKey: ["tickets"] }); client.invalidateQueries({ queryKey: ["comments"] }); client.invalidateQueries({ queryKey: ["dashboard"] }); } });
}
export function useCreateTicket() { return useWrite(ticketsApi.create); }
export function useUpdateTicket() { return useWrite(({ id, payload }) => ticketsApi.update(id, payload)); }
export function useAddTicketComment() { return useWrite(({ id, content }) => ticketsApi.addComment(id, content)); }
