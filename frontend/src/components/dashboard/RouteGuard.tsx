import { useEffect, type ReactNode } from "react";
import { useRouter, useRouterState } from "@tanstack/react-router";
import { useAuth } from "@/contexts/AuthContext";
import { ROLE_HOME, PUBLIC_ROUTES, isRouteAllowed } from "@/lib/auth-config";

export function RouteGuard({ children }: { children: ReactNode }) {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  const isPublic = PUBLIC_ROUTES.includes(pathname);

  useEffect(() => {
    if (isLoading) return;

    // Unauthenticated → force login
    if (!user) {
      if (!isPublic) router.navigate({ to: "/login", replace: true });
      return;
    }

    const home = ROLE_HOME[user.role] ?? "/login";

    // Authenticated user landing on login or root → send to role home
    if (pathname === "/login" || pathname === "/") {
      router.navigate({ to: home, replace: true });
      return;
    }

    // Authenticated but visiting a route not allowed for their role
    if (!isRouteAllowed(user.role, pathname)) {
      router.navigate({ to: home, replace: true });
    }
  }, [isLoading, user, pathname, isPublic, router]);

  // While restoring session, show a quiet shell to prevent flashes
  if (isLoading) {
    return (
      <div className="min-h-screen w-full grid place-items-center bg-background">
        <div className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
          Authenticating…
        </div>
      </div>
    );
  }

  // Block render of protected pages until redirect completes
  if (!user && !isPublic) return null;
  if (user && (pathname === "/" || !isPublic && !isRouteAllowed(user.role, pathname))) {
    return null;
  }

  return <>{children}</>;
}
