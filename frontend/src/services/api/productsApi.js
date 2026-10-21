import api from "../axios";

export async function fetchProducts(params = {}) {
  const { data } = await api.get("/products", { params });
  return data; // { items, pagination }
}

export async function fetchProduct(id) {
  const { data } = await api.get(`/products/${id}`);
  return data.product;
}

export async function createProduct(payload) {
  const { data } = await api.post("/products", payload);
  return data.product;
}

export async function updateProduct(id, payload) {
  const { data } = await api.patch(`/products/${id}`, payload);
  return data.product;
}

export async function deleteProduct(id) {
  await api.delete(`/products/${id}`);
}

export async function uploadProductImage(id, file) {
  const formData = new FormData();
  formData.append("image", file);
  const { data } = await api.post(`/products/${id}/image`, formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return data.product;
}
