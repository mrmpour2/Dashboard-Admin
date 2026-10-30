import api from "../axios";
export const ticketsApi = {
  list: (params = {}) => api.get("/tickets", { params }).then(({ data }) => data),
  assignees: () => api.get("/tickets/assignees").then(({ data }) => data.items),
  get: (id) => api.get(`/tickets/${id}`).then(({ data }) => data.ticket),
  create: (payload) => api.post("/tickets", payload).then(({ data }) => data.ticket),
  update: (id, payload) => api.patch(`/tickets/${id}`, payload).then(({ data }) => data.ticket),
  remove: (id) => api.delete(`/tickets/${id}`),
  addComment: (id, content) => api.post(`/tickets/${id}/comments`, { content }).then(({ data }) => data.comment),
  attachment: (id) => api.get(`/tickets/${id}/attachment`, { responseType: "blob" }).then(({ data }) => data),
};
