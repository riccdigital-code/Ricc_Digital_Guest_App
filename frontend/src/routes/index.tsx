import { createFileRoute } from "@tanstack/react-router";

// The root index acts purely as a routing pivot — the RouteGuard in
// __root.tsx redirects every authenticated visitor to their role's home
// dashboard, and unauthenticated visitors to /login.
export const Route = createFileRoute("/")({
  head: () => ({ meta: [{ title: "RoomBoss" }] }),
  component: IndexRedirect,
});

function IndexRedirect() {
  return (
    <div className="min-h-screen w-full grid place-items-center bg-background">
      <div className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
        Loading your workspace…
      </div>
    </div>
  );
}
