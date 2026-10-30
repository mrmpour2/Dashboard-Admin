import api from "../axios";

export async function fetchOrderAlertPhones() {
  const { data } = await api.get("/settings/order-alert-phones");
  return data;
}

export async function saveOrderAlertPhones(phones) {
  const { data } = await api.put("/settings/order-alert-phones", { phones });
  return data;
}
