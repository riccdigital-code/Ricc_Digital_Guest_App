import { apiClient } from "./axios";

export type TaskStatus =
  | "pending"
  | "assigned"
  | "in_progress"
  | "escalated"
  | "completed"
  | "cancelled";

export interface Task {
  id: string;
  room?: string;
  title: string;
  priority?: string;
  due?: string;
  progress?: number;
  status: TaskStatus;
  assignee?: { id: string; name: string } | null;
}

export interface TaskStats {
  assigned: number;
  inProgress: number;
  completedToday: number;
  avgMinutes: number;
}

// Allowed transitions per backend workflow
export const TRANSITIONS: Record<TaskStatus, TaskStatus[]> = {
  pending:     ["assigned"],
  assigned:    ["in_progress", "cancelled"],
  in_progress: ["completed", "escalated"],
  escalated:   ["in_progress"],
  completed:   [],
  cancelled:   [],
};

export const tasksApi = {
  list: async (): Promise<Task[]> => (await apiClient.get("/api/tasks")).data,
  myTasks: async (): Promise<Task[]> => (await apiClient.get("/api/tasks/my-tasks")).data,
  myStats: async (): Promise<TaskStats> => (await apiClient.get("/api/tasks/my-stats")).data,
  updateStatus: async (id: string, status: TaskStatus): Promise<Task> =>
    (await apiClient.patch(`/api/tasks/${id}/status`, { status })).data,
  assign: async (id: string, userId: string): Promise<Task> =>
    (await apiClient.patch(`/api/tasks/${id}/assign`, { userId })).data,
};
