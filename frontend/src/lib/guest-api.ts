import { apiClient } from "./axios";
import type { AuthUser } from "@/contexts/AuthContext";

export interface GuestSession {
  id: string;
  roomNumber: string;
  guestName?: string;
  propertyName?: string;
  checkOut?: string;
}

export interface GuestRequest {
  id: string;
  category: string;
  option: string;
  note?: string;
  status: "queued" | "in_progress" | "completed" | "cancelled" | "escalated";
  createdAt: string;
}

export interface GuestLoginResponse {
  token: string;
  user: AuthUser;
  session: GuestSession;
}

export const guestApi = {
  // Backend: POST /api/auth/guest { roomNumber, accessCode }
  login: async (roomNumber: string, accessCode: string): Promise<GuestLoginResponse> =>
    (await apiClient.post("/api/auth/guest", { roomNumber, accessCode })).data,

  // Active session for the current guest token
  session: async (): Promise<GuestSession> =>
    (await apiClient.get("/api/guest/session")).data,

  // List guest requests for this session
  myRequests: async (): Promise<GuestRequest[]> =>
    (await apiClient.get("/api/guest/requests")).data,

  // Submit a new request
  createRequest: async (body: {
    category: string;
    option: string;
    note?: string;
  }): Promise<GuestRequest> =>
    (await apiClient.post("/api/guest/requests", body)).data,
};
