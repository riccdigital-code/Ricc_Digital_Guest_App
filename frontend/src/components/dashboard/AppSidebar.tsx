import { Link, useRouter, useRouterState } from "@tanstack/react-router";
import {
  LayoutDashboard, Building2, AlertTriangle, ClipboardList, BarChart3,
  ConciergeBell, Users, ScrollText, Sparkles, BellRing, LogOut,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth, type Role } from "@/contexts/AuthContext";

type NavItem = { to: string; icon: typeof LayoutDashboard; label: string };
type NavGroup = { label: string; roles: Role[]; items: NavItem[] };

const groups: NavGroup[] = [
  {
    label: "Super Admin",
    roles: ["SUPER_ADMIN"],
    items: [
      { to: "/platform", icon: LayoutDashboard, label: "Platform Overview" },
      { to: "/properties", icon: Building2, label: "Properties" },
      { to: "/escalations", icon: AlertTriangle, label: "Escalations" },
      { to: "/analytics", icon: BarChart3, label: "Analytics" },
    ],
  },
  {
    label: "Hotel Admin",
    roles: ["ADMIN"],
    items: [
      { to: "/hotel", icon: ConciergeBell, label: "Operations Center" },
      { to: "/staff-workload", icon: Users, label: "Staff Workload" },
      { to: "/activity", icon: ScrollText, label: "Activity Log" },
    ],
  },
  {
    label: "Staff",
    roles: ["STAFF"],
    items: [
      { to: "/my-tasks", icon: ClipboardList, label: "My Tasks" },
    ],
  },
  {
    label: "Guest",
    roles: ["GUEST"],
    items: [
      { to: "/guest", icon: Sparkles, label: "Guest Requests" },
    ],
  },
];

const ROLE_LABEL: Record<Role, string> = {
  SUPER_ADMIN: "Super Administrator",
  ADMIN: "Hotel Administrator",
  STAFF: "Operations Staff",
  GUEST: "Guest",
};

export function AppSidebar() {
  const pathname = useRouterState({ select: (r) => r.location.pathname });
  const { user, logout } = useAuth();
  const router = useRouter();

  if (!user) return null;

  const visibleGroups = groups.filter((g) => g.roles.includes(user.role));

  const handleLogout = () => {
    logout();
    router.navigate({ to: "/login", replace: true });
  };

  const initials = user.name
    .split(" ")
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();

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
        {visibleGroups.map((g) => (
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
      <div className="p-4 border-t border-sidebar-border space-y-3">
        <div className="rounded-lg p-3 bg-gradient-dark hairline flex items-center gap-3">
          <div className="h-9 w-9 rounded-full bg-gradient-gold grid place-items-center text-primary-foreground text-xs font-semibold shadow-gold shrink-0">
            {initials || "·"}
          </div>
          <div className="min-w-0">
            <div className="text-sm font-medium truncate">{user.name}</div>
            <div className="text-[11px] text-primary truncate">{ROLE_LABEL[user.role]}</div>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="w-full inline-flex items-center justify-center gap-2 rounded-md hairline bg-card hover:bg-accent transition-colors px-3 py-2 text-xs text-muted-foreground hover:text-foreground"
        >
          <LogOut className="h-3.5 w-3.5" />
          Sign out
        </button>
      </div>
    </aside>
  );
}
