import { createFileRoute, Link } from "@tanstack/react-router";
import {
  AreaChart, Area, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid,
  BarChart, Bar,
} from "recharts";
import {
  Building2, AlertTriangle, ConciergeBell, TrendingUp, ArrowRight,
  Users, ListTodo, ShieldCheck, UserCog,
} from "lucide-react";
import { TopBar } from "@/components/dashboard/TopBar";
import { MetricCard, Panel, StatusPill } from "@/components/dashboard/Primitives";
import { dashboardApi } from "@/lib/dashboard-api";
import { useApi } from "@/hooks/use-api";

export const Route = createFileRoute("/platform")({
  head: () => ({ meta: [{ title: "Platform Overview — RoomBoss" }] }),
  component: SuperAdmin,
});

const chartGrid = "oklch(0.30 0.012 75 / 0.35)";

function SuperAdmin() {
  const stats = useApi(dashboardApi.platformStats, {
    totalProperties: 0, activeProperties: 0, totalAdmins: 0, totalStaff: 0,
    activeGuestSessions: 0, unresolvedTasks: 0, escalatedTasks: 0,
  });
  const properties = useApi(dashboardApi.properties, []);
  const escalations = useApi(dashboardApi.escalations, []);
  const requestVolume = useApi(dashboardApi.requestVolume, []);
  const responseByCategory = useApi(dashboardApi.responseByCategory, []);

  const anyFallback = [stats, properties, escalations, requestVolume, responseByCategory]
    .some((s) => s.fallback);

  return (
    <>
      <TopBar title="Platform Overview" subtitle="Real-time intelligence across every property" />
      <div className="p-4 lg:p-8 space-y-6">
        {anyFallback && (
          <div className="rounded-md bg-warning/10 text-warning text-xs px-3 py-2 hairline">
            Showing cached operational data — live platform endpoints unavailable.
          </div>
        )}

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCard label="Active Properties" value={`${stats.data.activeProperties}/${stats.data.totalProperties}`} icon={<Building2 className="h-4 w-4" />} />
          <MetricCard label="Hotel Admins" value={`${stats.data.totalAdmins}`} icon={<ShieldCheck className="h-4 w-4" />} />
          <MetricCard label="Staff" value={`${stats.data.totalStaff}`} icon={<Users className="h-4 w-4" />} />
          <MetricCard label="Active Guest Sessions" value={`${stats.data.activeGuestSessions}`} icon={<ConciergeBell className="h-4 w-4" />} />
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCard label="Unresolved Tasks" value={`${stats.data.unresolvedTasks}`} icon={<ListTodo className="h-4 w-4" />} />
          <MetricCard label="Escalated Tasks" value={`${stats.data.escalatedTasks}`} icon={<AlertTriangle className="h-4 w-4" />} />
          <MetricCard label="Properties / Admin" value={stats.data.totalAdmins ? (stats.data.totalProperties / stats.data.totalAdmins).toFixed(1) : "—"} icon={<UserCog className="h-4 w-4" />} />
          <MetricCard label="Live Health" value={stats.data.escalatedTasks > 10 ? "Attention" : "Nominal"} icon={<TrendingUp className="h-4 w-4" />} />
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          <Panel title="Global Request Volume" className="lg:col-span-2">
            <div className="h-72">
              <ResponsiveContainer>
                <AreaChart data={requestVolume.data}>
                  <defs>
                    <linearGradient id="gReq" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="oklch(0.82 0.14 85)" stopOpacity={0.6} />
                      <stop offset="100%" stopColor="oklch(0.82 0.14 85)" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="gRes" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="oklch(0.55 0.09 80)" stopOpacity={0.45} />
                      <stop offset="100%" stopColor="oklch(0.55 0.09 80)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke={chartGrid} strokeDasharray="3 3" />
                  <XAxis dataKey="day" stroke="oklch(0.7 0.012 80)" fontSize={12} />
                  <YAxis stroke="oklch(0.7 0.012 80)" fontSize={12} />
                  <Tooltip contentStyle={{ background: "oklch(0.18 0.005 60)", border: "1px solid oklch(0.78 0.13 82 / 0.25)", borderRadius: 8, color: "white" }} />
                  <Area type="monotone" dataKey="requests" stroke="oklch(0.82 0.14 85)" fill="url(#gReq)" strokeWidth={2} />
                  <Area type="monotone" dataKey="resolved" stroke="oklch(0.55 0.09 80)" fill="url(#gRes)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </Panel>

          <Panel title="Avg Response (min)">
            <div className="h-72">
              <ResponsiveContainer>
                <BarChart data={responseByCategory.data} layout="vertical" margin={{ left: 10 }}>
                  <CartesianGrid stroke={chartGrid} strokeDasharray="3 3" horizontal={false} />
                  <XAxis type="number" stroke="oklch(0.7 0.012 80)" fontSize={12} />
                  <YAxis dataKey="category" type="category" stroke="oklch(0.7 0.012 80)" fontSize={12} width={100} />
                  <Tooltip contentStyle={{ background: "oklch(0.18 0.005 60)", border: "1px solid oklch(0.78 0.13 82 / 0.25)", borderRadius: 8 }} />
                  <Bar dataKey="avg" fill="oklch(0.82 0.14 85)" radius={[0, 6, 6, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Panel>
        </div>

        <div className="grid lg:grid-cols-5 gap-6">
          <Panel title="Properties Overview" className="lg:col-span-3"
            action={<Link to="/properties" className="text-xs text-primary inline-flex items-center gap-1">View all <ArrowRight className="h-3 w-3" /></Link>}>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-[11px] uppercase tracking-wider text-muted-foreground">
                  <tr className="text-left"><th className="py-2">Property</th><th>Rooms</th><th>Occupancy</th><th>Revenue</th><th>Status</th></tr>
                </thead>
                <tbody>
                  {properties.data.map((p: any) => (
                    <tr key={p.id} className="border-t border-border/50 hover:bg-accent/30 transition-colors">
                      <td className="py-3 font-medium">{p.name}</td>
                      <td>{p.rooms}</td>
                      <td>
                        <div className="flex items-center gap-2">
                          <div className="h-1.5 w-20 rounded-full bg-muted overflow-hidden">
                            <div className="h-full bg-gradient-gold" style={{ width: `${p.occupancy}%` }} />
                          </div>
                          <span className="text-xs text-muted-foreground">{p.occupancy}%</span>
                        </div>
                      </td>
                      <td className="text-primary">${Number(p.revenue ?? 0).toLocaleString()}</td>
                      <td><StatusPill status={p.status} /></td>
                    </tr>
                  ))}
                  {properties.data.length === 0 && !properties.loading && (
                    <tr><td colSpan={5} className="py-6 text-center text-xs text-muted-foreground">No properties.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </Panel>

          <Panel title="Open Escalations" className="lg:col-span-2"
            action={<Link to="/escalations" className="text-xs text-primary inline-flex items-center gap-1">Manage <ArrowRight className="h-3 w-3" /></Link>}>
            <ul className="space-y-3">
              {escalations.data.map((e: any) => (
                <li key={e.id} className="rounded-lg p-3 bg-background/50 hairline">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-xs text-muted-foreground">{e.id} · {e.property}</div>
                      <div className="text-sm font-medium mt-0.5">Room {e.room} — {e.issue}</div>
                    </div>
                    <StatusPill status={e.priority} />
                  </div>
                  <div className="mt-2 text-[11px] text-muted-foreground">Elapsed {e.elapsed}</div>
                </li>
              ))}
              {escalations.data.length === 0 && !escalations.loading && (
                <li className="text-center text-xs text-muted-foreground py-6">No active escalations.</li>
              )}
            </ul>
          </Panel>
        </div>
      </div>
    </>
  );
}
