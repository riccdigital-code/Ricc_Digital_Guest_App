import { io, type Socket } from "socket.io-client";

const BASE_URL =
  (import.meta as any).env?.VITE_API_URL ?? "http://localhost:5000";

let socket: Socket | null = null;

export function getSocket(): Socket | null {
  if (typeof window === "undefined") return null;
  const token = window.localStorage.getItem("rb_token");
  if (!token) return null;
  if (socket && socket.connected) return socket;
  if (!socket) {
    socket = io(BASE_URL, {
      auth: { token },
      transports: ["websocket", "polling"],
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });
  }
  return socket;
}

export function disconnectSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}
