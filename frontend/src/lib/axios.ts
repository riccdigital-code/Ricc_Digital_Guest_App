import axios from "axios";

const BASE_URL =
  (import.meta as any).env?.VITE_API_URL ?? "http://localhost:5000";

export const apiClient = axios.create({
  baseURL: BASE_URL,
  headers: { "Content-Type": "application/json" },
});

apiClient.interceptors.request.use((config) => {
  if (typeof window !== "undefined") {
    const token = window.localStorage.getItem("rb_token");
    if (token) config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});
