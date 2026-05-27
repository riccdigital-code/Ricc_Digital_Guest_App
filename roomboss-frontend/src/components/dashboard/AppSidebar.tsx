import { Link, useRouterState } from "@tanstack/react-router";
import {
  LayoutDashboard,
  Building2,
  AlertTriangle,
  ClipboardList,
  BarChart3,
  ConciergeBell,
  Users,
  ScrollText,
  Sparkles,
  BellRing,
} from "lucide-react";
import { cn } from "@/lib/utils";

const groups = [
  {
    label: "Super Admin",
    items: [
      { to: "/", icon: LayoutDashboard, label: "Platform Overview" },
      { to: "/properties", icon: Building2, label: "Properties" },
      { to: "/escalations", icon: AlertTriangle, label: "Escalations" },
      { to: "/analytics", icon: BarChart3, label: "Analytics" },
    ],
  },
  {
    label: "Hotel Admin",
    items: [
      { to: "/hotel", icon: ConciergeBell, label: "Operations Center" },
      { to: "/staff-workload", icon: Users, label: "Staff Workload" },
      { to: "/activity", icon: ScrollText, label: "Activity Log" },
    ],
  },
  {
    label: "Staff",
    items: [{ to: "/my-tasks", icon: ClipboardList, label: "My Tasks" }],
  },
  {
    label: "Guest",
    items: [{ to: "/guest", icon: Sparkles, label: "Guest Requests" }],
  },
];

export function AppSidebar() {
  const pathname = useRouterState({ select: (r) => r.location.pathname });
  return (
    <aside className="hidden lg:flex w-64 shrink-0 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground">
      <div className="px-6 py-6 border-b border-sidebar-border">
        <Link to="/" className="flex items-center gap-2">
          <div className="h-9 w-9 rounded-lg bg-gradient-gold grid place-items-center shadow-gold">
            <BellRing className="h-4 w-4 text-primary-foreground" />
          </div>
          <div>
            <div className="font-display text-xl leading-none text-gradient-gold">RoomBoss</div>
            <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground mt-1">
              Hospitality OS
            </div>
          </div>
        </Link>
      </div>
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-6">
        {groups.map((g) => (
          <div key={g.label}>
            <div className="px-3 mb-2 text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
              {g.label}
            </div>
            <ul className="space-y-0.5">
              {g.items.map((it) => {
                const active = pathname === it.to;
                return (
                  <li key={it.to}>
                    <Link
                      to={it.to}
                      className={cn(
                        "flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
                        active
                          ? "bg-sidebar-accent text-primary ring-gold"
                          : "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                      )}
                    >
                      <it.icon className="h-4 w-4" />
                      <span>{it.label}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>
      <div className="p-4 border-t border-sidebar-border">
        <div className="rounded-lg p-3 bg-gradient-dark hairline">
          <div className="text-xs text-muted-foreground">Signed in as</div>
          <div className="text-sm font-medium">Élise Marchand</div>
          <div className="text-[11px] text-primary">Director of Operations</div>
        </div>
      </div>
    </aside>
  );
}
