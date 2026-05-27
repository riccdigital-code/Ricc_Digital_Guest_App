import { createFileRoute } from "@tanstack/react-router";
import { TopBar } from "@/components/dashboard/TopBar";
import { Panel } from "@/components/dashboard/Primitives";
import { staffWorkload } from "@/lib/mock-data";

export const Route = createFileRoute("/staff-workload")({
  head: () => ({ meta: [{ title: "Staff Workload — RoomBoss" }] }),
  component: () => (
    <>
      <TopBar title="Staff Workload" subtitle="Balance assignments across your team" />
      <div className="p-4 lg:p-8 grid md:grid-cols-2 xl:grid-cols-3 gap-5">
        {staffWorkload.map((s) => (
          <div key={s.name} className="rounded-xl bg-card hairline shadow-luxe p-5">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-full bg-gradient-gold grid place-items-center text-primary-foreground font-semibold shadow-gold">
                {s.name
                  .split(" ")
                  .map((p) => p[0])
                  .join("")}
              </div>
              <div>
                <div className="font-medium">{s.name}</div>
                <div className="text-xs text-muted-foreground">{s.role}</div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 mt-5">
              <div>
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                  Active
                </div>
                <div className="text-gradient-gold font-display text-2xl">{s.active}</div>
              </div>
              <div>
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                  Completed
                </div>
                <div className="text-gradient-gold font-display text-2xl">{s.completed}</div>
              </div>
            </div>
            <div className="mt-4">
              <div className="flex justify-between text-xs text-muted-foreground mb-1.5">
                <span>Load</span>
                <span>{s.load}%</span>
              </div>
              <div className="h-2 rounded-full bg-muted overflow-hidden">
                <div className="h-full bg-gradient-gold" style={{ width: `${s.load}%` }} />
              </div>
            </div>
          </div>
        ))}
      </div>
    </>
  ),
});
