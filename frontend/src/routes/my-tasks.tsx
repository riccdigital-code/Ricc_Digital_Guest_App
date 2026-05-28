import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { TopBar } from "@/components/dashboard/TopBar";
import { MetricCard, Panel, StatusPill } from "@/components/dashboard/Primitives";
import { myTasks as mockTasks } from "@/lib/mock-data";
import { tasksApi, TRANSITIONS, type Task, type TaskStatus } from "@/lib/tasks-api";
import { useAuth } from "@/contexts/AuthContext";
import { useTaskEvents } from "@/hooks/use-task-events";
import {
  AlertTriangle, Check, CheckCircle2, Clock, ListTodo,
  Play, RefreshCw, RotateCcw, Timer, UserCog, X,
} from "lucide-react";

export const Route = createFileRoute("/my-tasks")({
  head: () => ({ meta: [{ title: "My Tasks — RoomBoss" }] }),
  component: StaffDash,
});

type ActionDef = {
  label: string;
  target: TaskStatus;
  icon: React.ReactNode;
  variant: "primary" | "ghost" | "danger" | "warning";
  successMsg: string;
};

function actionsForStatus(status: TaskStatus): ActionDef[] {
  switch (status) {
    case "pending":
      return [{ label: "Accept", target: "assigned", icon: <Check className="h-3 w-3" />, variant: "primary", successMsg: "Task accepted" }];
    case "assigned":
      return [
        { label: "Start",  target: "in_progress", icon: <Play className="h-3 w-3" />, variant: "primary", successMsg: "Task started" },
        { label: "Cancel", target: "cancelled",   icon: <X className="h-3 w-3" />,    variant: "ghost",   successMsg: "Task cancelled" },
      ];
    case "in_progress":
      return [
        { label: "Complete", target: "completed", icon: <CheckCircle2 className="h-3 w-3" />, variant: "primary", successMsg: "Task completed" },
        { label: "Escalate", target: "escalated", icon: <AlertTriangle className="h-3 w-3" />, variant: "warning", successMsg: "Task escalated" },
      ];
    case "escalated":
      return [{ label: "Restart", target: "in_progress", icon: <RotateCcw className="h-3 w-3" />, variant: "primary", successMsg: "Task resumed" }];
    default:
      return [];
  }
}

const variantClass: Record<ActionDef["variant"], string> = {
  primary: "bg-gradient-gold text-primary-foreground shadow-gold hover:opacity-90",
  ghost:   "bg-accent/60 hover:bg-accent text-foreground",
  danger:  "bg-destructive/15 hover:bg-destructive/25 text-destructive",
  warning: "bg-warning/15 hover:bg-warning/25 text-warning",
};

function StaffDash() {
  const { user } = useAuth();
  const role = user?.role ?? "STAFF";
  const isStaff = role === "STAFF";
  const isAdmin = role === "ADMIN" || role === "SUPER_ADMIN";

  const [tasks, setTasks] = useState<Task[]>(mockTasks as Task[]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [reassignFor, setReassignFor] = useState<string | null>(null);
  const [reassignValue, setReassignValue] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = isAdmin ? await tasksApi.list() : await tasksApi.myTasks();
      setTasks(Array.isArray(data) ? data : []);
    } catch (e: any) {
      setError(e?.response?.data?.message ?? e?.message ?? "Failed to load tasks");
    } finally {
      setLoading(false);
    }
  }, [isAdmin]);

  useEffect(() => { void load(); }, [load]);

  // Realtime sync — merge live backend updates
  useTaskEvents({
    onUpdate: (incoming) => {
      setTasks((curr) => {
        const idx = curr.findIndex((t) => t.id === incoming.id);
        if (idx === -1) {
          // New visibility (admin) — append
          return isAdmin ? [incoming, ...curr] : curr;
        }
        const next = curr.slice();
        next[idx] = { ...next[idx], ...incoming };
        return next;
      });
    },
    onCreate: (t) => {
      if (!isAdmin && t.assignee?.id !== user?.id) return;
      setTasks((curr) => (curr.some((x) => x.id === t.id) ? curr : [t, ...curr]));
      toast("New task", { description: t.title });
    },
    onAssign: (t) => {
      setTasks((curr) => {
        const idx = curr.findIndex((x) => x.id === t.id);
        if (idx === -1) return isAdmin ? [t, ...curr] : curr;
        const next = curr.slice();
        next[idx] = { ...next[idx], ...t };
        return next;
      });
    },
    onDelete: (id) => setTasks((curr) => curr.filter((t) => t.id !== id)),
  }, Boolean(user));

  const onTransition = async (task: Task, target: TaskStatus, msg: string) => {
    if (!isStaff) return;
    if (!TRANSITIONS[task.status]?.includes(target)) {
      toast.error("Invalid transition");
      return;
    }
    setPendingId(task.id);
    const prev = tasks;
    setTasks(prev.map((t) => (t.id === task.id ? { ...t, status: target } : t)));
    try {
      const updated = await tasksApi.updateStatus(task.id, target);
      setTasks((curr) => curr.map((t) => (t.id === task.id ? { ...t, ...updated } : t)));
      toast.success(msg);
    } catch (e: any) {
      setTasks(prev);
      const m = e?.response?.data?.message ?? e?.message ?? "Status update failed";
      setError(m);
      toast.error(m);
    } finally {
      setPendingId(null);
    }
  };

  const onReassign = async (task: Task) => {
    const userId = reassignValue.trim();
    if (!userId) return;
    setPendingId(task.id);
    try {
      const updated = await tasksApi.assign(task.id, userId);
      setTasks((curr) => curr.map((t) => (t.id === task.id ? { ...t, ...updated } : t)));
      toast.success("Task reassigned");
      setReassignFor(null);
      setReassignValue("");
    } catch (e: any) {
      const m = e?.response?.data?.message ?? e?.message ?? "Reassignment failed";
      toast.error(m);
    } finally {
      setPendingId(null);
    }
  };

  const stats = useMemo(() => ({
    assigned:   tasks.filter((t) => t.status === "assigned").length,
    inProgress: tasks.filter((t) => t.status === "in_progress").length,
    escalated:  tasks.filter((t) => t.status === "escalated").length,
    completed:  tasks.filter((t) => t.status === "completed").length,
  }), [tasks]);

  const subtitle = isAdmin
    ? `${user?.name ?? "Administrator"} · ${role.replace("_", " ")} · All property tasks`
    : `${user?.name ?? "Staff"} · ${role} · Shift active`;

  return (
    <>
      <TopBar title={isAdmin ? "Task Operations" : "My Tasks"} subtitle={subtitle} />
      <div className="p-4 lg:p-8 space-y-6">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCard label="Assigned"    value={`${stats.assigned}`}   icon={<ListTodo className="h-4 w-4" />} />
          <MetricCard label="In Progress" value={`${stats.inProgress}`} icon={<Play className="h-4 w-4" />} />
          <MetricCard label="Escalated"   value={`${stats.escalated}`}  icon={<AlertTriangle className="h-4 w-4" />} />
          <MetricCard label="Completed"   value={`${stats.completed}`}  icon={<CheckCircle2 className="h-4 w-4" />} />
        </div>

        <Panel
          title={isAdmin ? "All Service Requests" : "Assigned Service Requests"}
          action={
            <button
              onClick={load}
              disabled={loading}
              className="inline-flex items-center gap-1.5 rounded-md bg-accent/60 hover:bg-accent px-3 py-1.5 text-xs disabled:opacity-50"
            >
              <RefreshCw className={`h-3 w-3 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </button>
          }
        >
          {error && (
            <div className="mb-3 rounded-md bg-destructive/10 text-destructive text-xs px-3 py-2 hairline">
              {error}
            </div>
          )}

          {loading && tasks.length === 0 ? (
            <div className="py-10 text-center text-sm text-muted-foreground inline-flex items-center justify-center gap-2 w-full">
              <Timer className="h-4 w-4 animate-pulse text-primary" /> Loading tasks…
            </div>
          ) : tasks.length === 0 ? (
            <div className="py-10 text-center text-sm text-muted-foreground">No tasks to display.</div>
          ) : (
            <ul className="space-y-3">
              {tasks.map((t) => {
                const actions = isStaff ? actionsForStatus(t.status) : [];
                const busy = pendingId === t.id;
                return (
                  <li key={t.id} className="rounded-lg bg-background/50 hairline p-4 transition-all">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs text-muted-foreground">{t.id}</span>
                          {t.room && <span className="text-xs text-primary">Room {t.room}</span>}
                          {t.priority && <StatusPill status={t.priority} />}
                          <StatusPill status={t.status} />
                        </div>
                        <div className="mt-1 font-medium">{t.title}</div>
                        {isAdmin && t.assignee && (
                          <div className="text-[11px] text-muted-foreground mt-0.5">
                            Assignee · {t.assignee.name}
                          </div>
                        )}
                      </div>
                      {t.due && (
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Clock className="h-3.5 w-3.5 text-primary" /> Due in {t.due}
                        </div>
                      )}
                    </div>

                    {typeof t.progress === "number" && (
                      <div className="mt-3 flex items-center gap-3">
                        <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
                          <div className="h-full bg-gradient-gold transition-all"
                               style={{ width: `${t.progress}%` }} />
                        </div>
                        <span className="text-xs text-muted-foreground w-10 text-right">{t.progress}%</span>
                      </div>
                    )}

                    {actions.length > 0 && (
                      <div className="mt-3 flex flex-wrap items-center gap-2">
                        {actions.map((a) => (
                          <button
                            key={a.target}
                            disabled={busy}
                            onClick={() => onTransition(t, a.target, a.successMsg)}
                            className={`rounded-md px-3 py-1.5 text-xs font-semibold inline-flex items-center gap-1 disabled:opacity-50 transition-opacity ${variantClass[a.variant]}`}
                          >
                            {busy ? <Timer className="h-3 w-3 animate-spin" /> : a.icon}
                            {a.label}
                          </button>
                        ))}
                      </div>
                    )}

                    {isAdmin && (
                      <div className="mt-3">
                        {reassignFor === t.id ? (
                          <div className="flex items-center gap-2">
                            <input
                              autoFocus
                              value={reassignValue}
                              onChange={(e) => setReassignValue(e.target.value)}
                              placeholder="Staff user ID"
                              className="flex-1 rounded-md bg-background hairline px-3 py-1.5 text-xs outline-none focus:ring-1 focus:ring-primary"
                            />
                            <button
                              disabled={busy || !reassignValue.trim()}
                              onClick={() => onReassign(t)}
                              className="rounded-md px-3 py-1.5 text-xs font-semibold bg-gradient-gold text-primary-foreground shadow-gold disabled:opacity-50"
                            >
                              {busy ? <Timer className="h-3 w-3 animate-spin" /> : "Confirm"}
                            </button>
                            <button
                              onClick={() => { setReassignFor(null); setReassignValue(""); }}
                              className="rounded-md px-3 py-1.5 text-xs bg-accent/60 hover:bg-accent"
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => { setReassignFor(t.id); setReassignValue(t.assignee?.id ?? ""); }}
                            className="inline-flex items-center gap-1.5 rounded-md bg-accent/40 hover:bg-accent text-xs px-3 py-1.5 text-muted-foreground hover:text-foreground"
                          >
                            <UserCog className="h-3 w-3" />
                            {t.assignee ? "Reassign" : "Assign"}
                          </button>
                        )}
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </Panel>
      </div>
    </>
  );
}
