import api from "../axios";

export async function fetchUsers(params = {}) {
  const { data } = await api.get("/users", { params });
  return data; // { items, pagination }
}

export async function fetchUser(id) {
  const { data } = await api.get(`/users/${id}`);
  return data.user;
}

export async function updateUser(id, payload) {
  const { data } = await api.patch(`/users/${id}`, payload);
  return data.user;
}

export async function deleteUser(id) {
  await api.delete(`/users/${id}`);
}

export async function updateMyProfile(payload) {
  const { data } = await api.patch("/users/me", payload);
  return data.user;
}

export async function changeMyPassword(payload) {
  await api.patch("/users/me/password", payload);
}
