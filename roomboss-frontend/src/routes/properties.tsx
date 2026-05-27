import { createFileRoute } from "@tanstack/react-router";
import { TopBar } from "@/components/dashboard/TopBar";
import { Panel, StatusPill } from "@/components/dashboard/Primitives";
import { properties } from "@/lib/mock-data";

export const Route = createFileRoute("/properties")({
  head: () => ({ meta: [{ title: "Properties — RoomBoss" }] }),
  component: () => (
    <>
      <TopBar title="Properties" subtitle="Portfolio across 42 luxury properties" />
      <div className="p-4 lg:p-8">
        <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-5">
          {properties.map((p) => (
            <div
              key={p.id}
              className="rounded-xl bg-card hairline shadow-luxe p-5 relative overflow-hidden"
            >
              <div className="absolute inset-x-0 top-0 h-px bg-gradient-gold opacity-60" />
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-display text-xl">{p.name}</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">{p.rooms} rooms</p>
                </div>
                <StatusPill status={p.status} />
              </div>
              <div className="grid grid-cols-3 gap-3 mt-5">
                <div>
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                    Occupancy
                  </div>
                  <div className="text-gradient-gold font-display text-xl">{p.occupancy}%</div>
                </div>
                <div>
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                    Revenue
                  </div>
                  <div className="text-gradient-gold font-display text-xl">
                    ${(p.revenue / 1000).toFixed(0)}k
                  </div>
                </div>
                <div>
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                    Alerts
                  </div>
                  <div className="text-gradient-gold font-display text-xl">{p.alerts}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  ),
});
