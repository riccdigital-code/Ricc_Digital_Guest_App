import { createFileRoute } from "@tanstack/react-router";
import { TopBar } from "@/components/dashboard/TopBar";
import { Panel } from "@/components/dashboard/Primitives";
import { useApi } from "@/hooks/use-api";
import { dashboardApi } from "@/lib/dashboard-api";
import { useAuth } from "@/contexts/AuthContext";
import { useTaskEvents } from "@/hooks/use-task-events";

export const Route = createFileRoute("/activity")({
  head: () => ({ meta: [{ title: "Activity Log — RoomBoss" }] }),
  component: ActivityPage,
});

function ActivityPage() {
  const { user } = useAuth();
  const activity = useApi(() => dashboardApi.recentActivity(user?.propertyId), [], [user?.propertyId]);
  useTaskEvents({ onAny: () => activity.refetch() });

  return (
    <>
      <TopBar title="Activity Log" subtitle="Chronological record of operational events" />
      <div className="p-4 lg:p-8">
        <Panel title="Today">
          {activity.data.length === 0 && !activity.loading ? (
            <div className="py-10 text-center text-sm text-muted-foreground">No activity recorded yet.</div>
          ) : (
            <ol className="relative border-l border-border/60 ml-3 space-y-5">
              {activity.data.map((a: any, i: number) => (
                <li key={i} className="pl-5 relative">
                  <div className="absolute -left-[7px] top-1.5 h-3 w-3 rounded-full bg-gradient-gold ring-4 ring-background" />
                  <div className="text-[11px] text-muted-foreground">{a.time}</div>
                  <div className="text-sm">
                    <span className="font-medium">{a.actor}</span>{" "}
                    <span className="text-muted-foreground">{a.action}</span>{" "}
                    <span className="text-primary">{a.target}</span>
                  </div>
                </li>
              ))}
            </ol>
          )}
        </Panel>
      </div>
    </>
  );
}
