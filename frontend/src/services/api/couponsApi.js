import api from "../axios";

export async function fetchCoupons(params = {}) {
  const { data } = await api.get("/coupons", { params });
  return data; // { items, pagination }
}

export async function fetchCoupon(id) {
  const { data } = await api.get(`/coupons/${id}`);
  return data.coupon;
}

export async function createCoupon(payload) {
  const { data } = await api.post("/coupons", payload);
  return data.coupon;
}

export async function updateCoupon(id, payload) {
  const { data } = await api.patch(`/coupons/${id}`, payload);
  return data.coupon;
}

export async function deleteCoupon(id) {
  await api.delete(`/coupons/${id}`);
}
