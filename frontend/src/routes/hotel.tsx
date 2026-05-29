import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect } from "react";
import { TopBar } from "@/components/dashboard/TopBar";
import { MetricCard, Panel, StatusPill } from "@/components/dashboard/Primitives";
import { Bell, Clock, Users, CheckCircle2, ArrowRight, ConciergeBell } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useApi } from "@/hooks/use-api";
import { dashboardApi } from "@/lib/dashboard-api";
import { useTaskEvents } from "@/hooks/use-task-events";

export const Route = createFileRoute("/hotel")({
  head: () => ({ meta: [{ title: "Operations Center — RoomBoss" }] }),
  component: Hotel,
});

function Hotel() {
  const { user } = useAuth();
  const propertyId = user?.propertyId;

  const stats     = useApi(() => dashboardApi.hotelStats(propertyId), {
    liveRequests: 0, avgResponseMinutes: 0, staffOnShift: 0, resolvedToday: 0, activeGuestSessions: 0,
  }, [propertyId]);
  const requests  = useApi(() => dashboardApi.liveRequests(propertyId), [], [propertyId]);
  const alerts    = useApi(() => dashboardApi.operationalAlerts(propertyId), [], [propertyId]);
  const workload  = useApi(() => dashboardApi.staffWorkload(propertyId), [], [propertyId]);
  const activity  = useApi(() => dashboardApi.recentActivity(propertyId), [], [propertyId]);

  // Live refresh on relevant operational events
  useTaskEvents({
    onAny: () => {
      stats.refetch();
      requests.refetch();
      activity.refetch();
    },
  });

  // Keep alerts/workload in step with the rest at first paint
  useEffect(() => { /* noop, kept for future socket plumbing */ }, []);

  const fallback = [stats, requests, alerts, workload, activity].some((s) => s.fallback);

  return (
    <>
      <TopBar title="Operations Center" subtitle={user?.name ? `${user.name} · Hotel operations` : "Hotel operations"} />
      <div className="p-4 lg:p-8 space-y-6">
        {fallback && (
          <div className="rounded-md bg-warning/10 text-warning text-xs px-3 py-2 hairline">
            Some live endpoints unavailable — operational data is cached.
          </div>
        )}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCard label="Live Requests" value={`${stats.data.liveRequests}`} icon={<Bell className="h-4 w-4" />} />
          <MetricCard label="Avg Response" value={`${stats.data.avgResponseMinutes}m`} icon={<Clock className="h-4 w-4" />} />
          <MetricCard label="Staff On Shift" value={`${stats.data.staffOnShift}`} icon={<Users className="h-4 w-4" />} />
          <MetricCard label="Resolved Today" value={`${stats.data.resolvedToday}`} icon={<CheckCircle2 className="h-4 w-4" />} />
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCard label="Active Guest Sessions" value={`${stats.data.activeGuestSessions}`} icon={<ConciergeBell className="h-4 w-4" />} />
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          <Panel title="Live Guest Requests" className="lg:col-span-2">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-[11px] uppercase tracking-wider text-muted-foreground">
                  <tr className="text-left"><th className="py-2">Request</th><th>Room</th><th>Type</th><th>Assignee</th><th>SLA</th><th>Status</th></tr>
                </thead>
                <tbody>
                  {requests.data.map((r: any) => (
                    <tr key={r.id} className="border-t border-border/50 hover:bg-accent/30">
                      <td className="py-3">
                        <div className="font-medium">{r.id}</div>
                        <div className="text-[11px] text-muted-foreground">{r.guest}</div>
                      </td>
                      <td className="text-primary">{r.room}</td>
                      <td>
                        <div className="flex items-center gap-2">
                          {r.priority === "vip" && <StatusPill status="vip" />}
                          <span>{r.type}</span>
                        </div>
                      </td>
                      <td className="text-muted-foreground">{r.assignee}</td>
                      <td>{r.sla}</td>
                      <td><StatusPill status={r.status} /></td>
                    </tr>
                  ))}
                  {requests.data.length === 0 && !requests.loading && (
                    <tr><td colSpan={6} className="py-6 text-center text-xs text-muted-foreground">No live requests.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </Panel>

          <Panel title="Operational Alerts">
            <ul className="space-y-3">
              {alerts.data.map((a: any) => (
                <li key={a.id} className="rounded-lg bg-background/50 hairline p-3">
                  <div className="flex items-start justify-between gap-2">
                    <StatusPill status={a.level} />
                    <span className="text-[10px] text-muted-foreground">{a.time}</span>
                  </div>
                  <p className="text-sm mt-2">{a.message}</p>
                </li>
              ))}
              {alerts.data.length === 0 && !alerts.loading && (
                <li className="text-center text-xs text-muted-foreground py-6">No alerts.</li>
              )}
            </ul>
          </Panel>
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          <Panel title="Staff Workload"
            action={<Link to="/staff-workload" className="text-xs text-primary inline-flex items-center gap-1">Details <ArrowRight className="h-3 w-3" /></Link>}>
            <ul className="space-y-3">
              {workload.data.map((s: any) => (
                <li key={s.name} className="grid grid-cols-[1fr_auto] gap-3 items-center">
                  <div>
                    <div className="text-sm font-medium">{s.name}</div>
                    <div className="text-[11px] text-muted-foreground">{s.role} · {s.active} active · {s.completed} done today</div>
                    <div className="mt-2 h-1.5 rounded-full bg-muted overflow-hidden">
                      <div className="h-full bg-gradient-gold" style={{ width: `${s.load}%` }} />
                    </div>
                  </div>
                  <div className="text-sm text-primary font-display text-xl">{s.load}%</div>
                </li>
              ))}
              {workload.data.length === 0 && !workload.loading && (
                <li className="text-center text-xs text-muted-foreground py-6">No staff data.</li>
              )}
            </ul>
          </Panel>

          <Panel title="Recent Operational Activity"
            action={<Link to="/activity" className="text-xs text-primary inline-flex items-center gap-1">Full log <ArrowRight className="h-3 w-3" /></Link>}>
            <ul className="space-y-3">
              {activity.data.map((a: any, i: number) => (
                <li key={i} className="flex items-start gap-3 text-sm">
                  <div className="text-[11px] text-muted-foreground w-12 shrink-0 pt-0.5">{a.time}</div>
                  <div className="h-2 w-2 rounded-full bg-primary mt-1.5 shrink-0" />
                  <div>
                    <span className="font-medium">{a.actor}</span>{" "}
                    <span className="text-muted-foreground">{a.action}</span>{" "}
                    <span className="text-primary">{a.target}</span>
                  </div>
                </li>
              ))}
              {activity.data.length === 0 && !activity.loading && (
                <li className="text-center text-xs text-muted-foreground py-6">No recent activity.</li>
              )}
            </ul>
          </Panel>
        </div>
      </div>
    </>
  );
}
