import api from "../axios";

export async function fetchTickets(params = {}) {
  const { data } = await api.get("/tickets", { params });
  return data; // { items, pagination }
}

export async function fetchTicket(id) {
  const { data } = await api.get(`/tickets/${id}`);
  return data.ticket;
}

export async function createTicket(payload) {
  const { data } = await api.post("/tickets", payload);
  return data.ticket;
}

export async function updateTicket(id, payload) {
  const { data } = await api.patch(`/tickets/${id}`, payload);
  return data.ticket;
}

export async function deleteTicket(id) {
  await api.delete(`/tickets/${id}`);
}

export async function addTicketComment(id, content) {
  const { data } = await api.post(`/tickets/${id}/comments`, { content });
  return data.comment;
}
