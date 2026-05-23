import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { TopBar } from "@/components/dashboard/TopBar";
import { MetricCard, Panel, StatusPill } from "@/components/dashboard/Primitives";
import { myTasks } from "@/lib/mock-data";
import { Clock, CheckCircle2, ListTodo, Timer, Play, Check } from "lucide-react";

export const Route = createFileRoute("/my-tasks")({
  head: () => ({ meta: [{ title: "My Tasks — RoomBoss" }] }),
  component: StaffDash,
});

function StaffDash() {
  const [tasks, setTasks] = useState(myTasks);
  const update = (id: string, patch: Partial<(typeof myTasks)[number]>) =>
    setTasks(t => t.map(x => x.id === id ? { ...x, ...patch } : x));

  return (
    <>
      <TopBar title="My Tasks" subtitle="Amélie R. · Housekeeping Lead · Shift ends 18:00" />
      <div className="p-4 lg:p-8 space-y-6">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCard label="Assigned" value={`${tasks.length}`} icon={<ListTodo className="h-4 w-4" />} />
          <MetricCard label="In Progress" value={`${tasks.filter(t=>t.progress>0&&t.progress<100).length}`} icon={<Play className="h-4 w-4" />} />
          <MetricCard label="Avg Time" value="9.2m" delta="-0.8m" trend="down" icon={<Timer className="h-4 w-4" />} />
          <MetricCard label="Completed Today" value="18" delta="+4" trend="up" icon={<CheckCircle2 className="h-4 w-4" />} />
        </div>

        <Panel title="Assigned Service Requests">
          <ul className="space-y-3">
            {tasks.map(t => (
              <li key={t.id} className="rounded-lg bg-background/50 hairline p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs text-muted-foreground">{t.id}</span>
                      <span className="text-xs text-primary">Room {t.room}</span>
                      <StatusPill status={t.priority} />
                    </div>
                    <div className="mt-1 font-medium">{t.title}</div>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Clock className="h-3.5 w-3.5 text-primary" /> Due in {t.due}
                  </div>
                </div>
                <div className="mt-3 flex items-center gap-3">
                  <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
                    <div className="h-full bg-gradient-gold transition-all" style={{ width: `${t.progress}%` }} />
                  </div>
                  <span className="text-xs text-muted-foreground w-10 text-right">{t.progress}%</span>
                  <button onClick={() => update(t.id, { progress: Math.min(100, t.progress + 20) })}
                    className="rounded-md bg-accent/60 hover:bg-accent px-3 py-1.5 text-xs inline-flex items-center gap-1">
                    <Play className="h-3 w-3" /> Advance
                  </button>
                  <button onClick={() => update(t.id, { progress: 100 })}
                    className="rounded-md bg-gradient-gold text-primary-foreground px-3 py-1.5 text-xs font-semibold inline-flex items-center gap-1 shadow-gold">
                    <Check className="h-3 w-3" /> Complete
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </Panel>
      </div>
    </>
  );
}
