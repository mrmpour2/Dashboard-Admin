import api from "../axios";

export async function fetchOrders(params = {}) {
  const { data } = await api.get("/orders", { params });
  return data; // { items, pagination }
}

export async function fetchOrder(id) {
  const { data } = await api.get(`/orders/${id}`);
  return data.order;
}

export async function createOrder(payload) {
  const { data } = await api.post("/orders", payload);
  return data.order;
}

export async function updateOrderStatus(id, status) {
  const { data } = await api.patch(`/orders/${id}/status`, { status });
  return data.order;
}

export async function fetchSiteOrders(params = {}) {
  const { data } = await api.get("/orders/site", { params });
  return data;
}

export async function fetchSiteOrder(id) {
  const { data } = await api.get(`/orders/site/${id}`);
  return data.order;
}

export async function updateSiteOrderStatus(id, status) {
  const { data } = await api.patch(`/orders/site/${id}/status`, { status });
  return data.order;
}
