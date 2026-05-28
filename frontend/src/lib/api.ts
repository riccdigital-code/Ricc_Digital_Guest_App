// Placeholder API client. Wire to your Express backend.
// Example: VITE_API_URL=https://api.roomboss.example.com
const BASE = (import.meta as any).env?.VITE_API_URL ?? "https://api.roomboss.example.com";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
    ...init,
  });
  if (!res.ok) throw new Error(`API ${res.status}`);
  return res.json() as Promise<T>;
}

export const api = {
  // GET /api/properties
  listProperties: () => request("/api/properties"),
  // GET /api/requests?status=open
  listRequests:   (status?: string) => request(`/api/requests${status ? `?status=${status}` : ""}`),
  // POST /api/requests
  createRequest:  (body: Record<string, unknown>) =>
    request("/api/requests", { method: "POST", body: JSON.stringify(body) }),
  // GET /api/staff/me/tasks
  myTasks:        () => request("/api/staff/me/tasks"),
  // PATCH /api/tasks/:id
  updateTask:     (id: string, body: Record<string, unknown>) =>
    request(`/api/tasks/${id}`, { method: "PATCH", body: JSON.stringify(body) }),
};
