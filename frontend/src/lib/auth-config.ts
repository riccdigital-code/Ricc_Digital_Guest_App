import type { Role } from "@/contexts/AuthContext";

export const ROLE_ROUTES: Record<Role, string[]> = {
  SUPER_ADMIN: ["/platform", "/properties", "/analytics", "/escalations"],
  ADMIN: ["/hotel", "/staff-workload", "/activity"],
  STAFF: ["/my-tasks"],
  GUEST: ["/guest"],
};

export const ROLE_HOME: Record<Role, string> = {
  SUPER_ADMIN: "/platform",
  ADMIN: "/hotel",
  STAFF: "/my-tasks",
  GUEST: "/guest",
};

export const PUBLIC_ROUTES = ["/login"];

export function isRouteAllowed(role: Role, pathname: string): boolean {
  return ROLE_ROUTES[role]?.some(
    (r) => pathname === r || pathname.startsWith(r + "/"),
  ) ?? false;
}
