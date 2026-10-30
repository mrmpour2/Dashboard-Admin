import api from "../axios";

export async function fetchFaqItems() {
  return (await api.get("/faqs")).data.items;
}

export async function createFaqItem(payload) {
  return (await api.post("/faqs", payload)).data.item;
}

export async function updateFaqItem(id, payload) {
  return (await api.patch(`/faqs/${id}`, payload)).data.item;
}
