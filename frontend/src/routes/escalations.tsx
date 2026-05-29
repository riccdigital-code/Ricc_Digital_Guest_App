import { createFileRoute } from "@tanstack/react-router";
import { TopBar } from "@/components/dashboard/TopBar";
import { Panel, StatusPill } from "@/components/dashboard/Primitives";
import { AlertTriangle } from "lucide-react";
import { useApi } from "@/hooks/use-api";
import { dashboardApi } from "@/lib/dashboard-api";

export const Route = createFileRoute("/escalations")({
  head: () => ({ meta: [{ title: "Escalations — RoomBoss" }] }),
  component: Escalations,
});

function Escalations() {
  const escalations = useApi(dashboardApi.escalations, []);
  return (
    <>
      <TopBar title="Escalations" subtitle="Issues requiring leadership attention" />
      <div className="p-4 lg:p-8">
        <Panel title="Active Escalations">
          {escalations.loading && escalations.data.length === 0 ? (
            <div className="py-10 text-center text-sm text-muted-foreground">Loading escalations…</div>
          ) : escalations.data.length === 0 ? (
            <div className="py-10 text-center text-sm text-muted-foreground">No active escalations.</div>
          ) : (
            <ul className="divide-y divide-border/50">
              {escalations.data.map((e: any) => (
                <li key={e.id} className="py-4 flex items-start gap-4">
                  <div className="h-10 w-10 rounded-md bg-destructive/15 text-destructive grid place-items-center shrink-0">
                    <AlertTriangle className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs text-muted-foreground">{e.id}</span>
                      <span className="text-xs text-muted-foreground">·</span>
                      <span className="text-xs text-muted-foreground">{e.property}</span>
                      <StatusPill status={e.priority} />
                    </div>
                    <div className="mt-1 font-medium">Room {e.room} — {e.issue}</div>
                    <div className="text-xs text-muted-foreground mt-1">Elapsed {e.elapsed}</div>
                  </div>
                  <button className="rounded-md bg-gradient-gold px-4 py-2 text-xs font-semibold text-primary-foreground shadow-gold whitespace-nowrap">
                    Take Action
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>
    </>
  );
}
