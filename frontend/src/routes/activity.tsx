import { createFileRoute } from "@tanstack/react-router";
import { TopBar } from "@/components/dashboard/TopBar";
import { Panel } from "@/components/dashboard/Primitives";
import { recentActivity } from "@/lib/mock-data";

const extended = [
  ...recentActivity,
  { time: "12:12", actor: "Lukas B.", action: "Replaced HVAC filter", target: "Room 1604" },
  { time: "12:05", actor: "Sofía M.", action: "Welcomed VIP arrival",  target: "Suite 0902" },
  { time: "11:58", actor: "Amélie R.", action: "Restocked minibar",    target: "Room 1110" },
  { time: "11:44", actor: "System",   action: "SLA breach prevented",  target: "R-8801" },
  { time: "11:30", actor: "Hiro T.",  action: "Arranged private car",   target: "Mr. Halberg" },
];

export const Route = createFileRoute("/activity")({
  head: () => ({ meta: [{ title: "Activity Log — RoomBoss" }] }),
  component: () => (
    <>
      <TopBar title="Activity Log" subtitle="Chronological record of operational events" />
      <div className="p-4 lg:p-8">
        <Panel title="Today">
          <ol className="relative border-l border-border/60 ml-3 space-y-5">
            {extended.map((a, i) => (
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
        </Panel>
      </div>
    </>
  ),
});
