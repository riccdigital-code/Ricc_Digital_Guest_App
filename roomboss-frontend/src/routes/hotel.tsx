import { createFileRoute, Link } from "@tanstack/react-router";
import { TopBar } from "@/components/dashboard/TopBar";
import { MetricCard, Panel, StatusPill } from "@/components/dashboard/Primitives";
import { liveRequests, staffWorkload, operationalAlerts, recentActivity } from "@/lib/mock-data";
import { Bell, Clock, Users, CheckCircle2, ArrowRight } from "lucide-react";

export const Route = createFileRoute("/hotel")({
  head: () => ({ meta: [{ title: "Operations Center — RoomBoss" }] }),
  component: Hotel,
});

function Hotel() {
  return (
    <>
      <TopBar title="Operations Center" subtitle="The Aurelian — Paris · 218 rooms" />
      <div className="p-4 lg:p-8 space-y-6">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCard
            label="Live Requests"
            value="24"
            delta="+6 vs avg"
            trend="up"
            icon={<Bell className="h-4 w-4" />}
          />
          <MetricCard
            label="Avg Response"
            value="6.4m"
            delta="-1.2m"
            trend="down"
            icon={<Clock className="h-4 w-4" />}
          />
          <MetricCard
            label="Staff On Shift"
            value="38"
            delta="+2"
            trend="up"
            icon={<Users className="h-4 w-4" />}
          />
          <MetricCard
            label="Resolved Today"
            value="186"
            delta="+18%"
            trend="up"
            icon={<CheckCircle2 className="h-4 w-4" />}
          />
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          <Panel title="Live Guest Requests" className="lg:col-span-2">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-[11px] uppercase tracking-wider text-muted-foreground">
                  <tr className="text-left">
                    <th className="py-2">Request</th>
                    <th>Room</th>
                    <th>Type</th>
                    <th>Assignee</th>
                    <th>SLA</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {liveRequests.map((r) => (
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
                      <td>
                        <StatusPill status={r.status} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Panel>

          <Panel title="Operational Alerts">
            <ul className="space-y-3">
              {operationalAlerts.map((a) => (
                <li key={a.id} className="rounded-lg bg-background/50 hairline p-3">
                  <div className="flex items-start justify-between gap-2">
                    <StatusPill status={a.level} />
                    <span className="text-[10px] text-muted-foreground">{a.time}</span>
                  </div>
                  <p className="text-sm mt-2">{a.message}</p>
                </li>
              ))}
            </ul>
          </Panel>
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          <Panel
            title="Staff Workload"
            action={
              <Link
                to="/staff-workload"
                className="text-xs text-primary inline-flex items-center gap-1"
              >
                Details <ArrowRight className="h-3 w-3" />
              </Link>
            }
          >
            <ul className="space-y-3">
              {staffWorkload.map((s) => (
                <li key={s.name} className="grid grid-cols-[1fr_auto] gap-3 items-center">
                  <div>
                    <div className="text-sm font-medium">{s.name}</div>
                    <div className="text-[11px] text-muted-foreground">
                      {s.role} · {s.active} active · {s.completed} done today
                    </div>
                    <div className="mt-2 h-1.5 rounded-full bg-muted overflow-hidden">
                      <div className="h-full bg-gradient-gold" style={{ width: `${s.load}%` }} />
                    </div>
                  </div>
                  <div className="text-sm text-primary font-display text-xl">{s.load}%</div>
                </li>
              ))}
            </ul>
          </Panel>

          <Panel
            title="Recent Operational Activity"
            action={
              <Link to="/activity" className="text-xs text-primary inline-flex items-center gap-1">
                Full log <ArrowRight className="h-3 w-3" />
              </Link>
            }
          >
            <ul className="space-y-3">
              {recentActivity.map((a, i) => (
                <li key={i} className="flex items-start gap-3 text-sm">
                  <div className="text-[11px] text-muted-foreground w-12 shrink-0 pt-0.5">
                    {a.time}
                  </div>
                  <div className="h-2 w-2 rounded-full bg-primary mt-1.5 shrink-0" />
                  <div>
                    <span className="font-medium">{a.actor}</span>{" "}
                    <span className="text-muted-foreground">{a.action}</span>{" "}
                    <span className="text-primary">{a.target}</span>
                  </div>
                </li>
              ))}
            </ul>
          </Panel>
        </div>
      </div>
    </>
  );
}
