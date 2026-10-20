import api from "../axios";
export const productsApi = {
  list: (params = {}) => api.get("/products", { params }).then(({ data }) => data),
  get: (id) => api.get(`/products/${id}`).then(({ data }) => data.product),
  create: (payload) => api.post("/products", payload).then(({ data }) => data.product),
  update: (id, payload) => api.patch(`/products/${id}`, payload).then(({ data }) => data.product),
  remove: (id) => api.delete(`/products/${id}`),
};
