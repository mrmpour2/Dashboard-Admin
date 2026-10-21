import api from "../axios";
export const usersApi = {
  create: (payload) => api.post("/users", payload).then(({ data }) => data.user),
  list: (params = {}) => api.get("/users", { params }).then(({ data }) => data),
  get: (id) => api.get(`/users/${id}`).then(({ data }) => data.user),
  update: (id, payload) => api.patch(`/users/${id}`, payload).then(({ data }) => data.user),
  remove: (id) => api.delete(`/users/${id}`),
};
