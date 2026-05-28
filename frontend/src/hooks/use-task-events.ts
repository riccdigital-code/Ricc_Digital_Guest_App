import { useEffect } from "react";
import { getSocket } from "@/lib/socket";
import type { Task } from "@/lib/tasks-api";

type Handlers = {
  onUpdate?: (task: Task) => void;
  onCreate?: (task: Task) => void;
  onDelete?: (id: string) => void;
  onAssign?: (task: Task) => void;
  onAny?: () => void;
};

const EVENTS = [
  "task:created",
  "task:updated",
  "task:assigned",
  "task:reassigned",
  "task:status",
  "task:deleted",
];

export function useTaskEvents(handlers: Handlers, enabled = true) {
  useEffect(() => {
    if (!enabled) return;
    const s = getSocket();
    if (!s) return;

    const update = (t: Task) => { handlers.onUpdate?.(t); handlers.onAny?.(); };
    const create = (t: Task) => { handlers.onCreate?.(t); handlers.onAny?.(); };
    const assign = (t: Task) => { handlers.onAssign?.(t); handlers.onAny?.(); };
    const del = (p: { id: string } | string) => {
      handlers.onDelete?.(typeof p === "string" ? p : p.id);
      handlers.onAny?.();
    };

    s.on("task:created", create);
    s.on("task:updated", update);
    s.on("task:status", update);
    s.on("task:assigned", assign);
    s.on("task:reassigned", assign);
    s.on("task:deleted", del);

    return () => {
      EVENTS.forEach((e) => s.off(e));
    };
  }, [enabled, handlers]);
}
