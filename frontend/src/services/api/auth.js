import api from "../axios";
import { getAccessToken, setAccessToken, clearAccessToken } from "../tokenStore";
export const authApi = {
  me: async () => {
    if (getAccessToken()) return api.get("/auth/me").then(({ data }) => data.user);
    const { data } = await api.post("/auth/refresh");
    setAccessToken(data.accessToken);
    return data.user;
  },
  login: async (payload) => { const { data } = await api.post("/auth/login", payload); setAccessToken(data.accessToken); return data.user; },
  logout: async () => { try { await api.post("/auth/logout"); } finally { clearAccessToken(); } },
};
