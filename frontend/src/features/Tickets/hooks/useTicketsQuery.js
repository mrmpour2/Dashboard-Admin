import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  fetchTickets,
  fetchTicket,
  createTicket,
  updateTicket,
  deleteTicket,
  addTicketComment,
} from "../../../services/api/ticketsApi";

export const ticketsKeys = {
  all: ["tickets"],
  list: (params) => [...ticketsKeys.all, "list", params],
  detail: (id) => [...ticketsKeys.all, "detail", id],
};

export function useTicketsQuery(params = {}) {
  return useQuery({
    queryKey: ticketsKeys.list(params),
    queryFn: () => fetchTickets(params),
    placeholderData: (previousData) => previousData,
  });
}

export function useTicketQuery(id) {
  return useQuery({
    queryKey: ticketsKeys.detail(id),
    queryFn: () => fetchTicket(id),
    enabled: Boolean(id),
  });
}

export function useCreateTicketMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload) => createTicket(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      queryClient.invalidateQueries({ queryKey: ticketsKeys.all });
    },
  });
}

export function useUpdateTicketMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }) => updateTicket(id, payload),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      queryClient.invalidateQueries({ queryKey: ticketsKeys.all });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      queryClient.invalidateQueries({ queryKey: ticketsKeys.detail(variables.id) });
    },
  });
}

export function useDeleteTicketMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id) => deleteTicket(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      queryClient.invalidateQueries({ queryKey: ticketsKeys.all });
    },
  });
}

export function useAddCommentMutation(ticketId) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (content) => addTicketComment(ticketId, content),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      queryClient.invalidateQueries({ queryKey: ticketsKeys.detail(ticketId) });
    },
  });
}
