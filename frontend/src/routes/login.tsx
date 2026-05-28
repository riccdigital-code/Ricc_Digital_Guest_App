import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { BellRing, Loader2, AlertCircle } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { ROLE_HOME } from "@/lib/auth-config";

export const Route = createFileRoute("/login")({
  head: () => ({ meta: [{ title: "Sign in — RoomBoss" }] }),
  component: LoginPage,
});

function LoginPage() {
  const { login } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const user = await login(email.trim(), password);
      const dest = ROLE_HOME[user.role] ?? "/";
      router.navigate({ to: dest });
    } catch (err: any) {
      const msg =
        err?.response?.data?.message ||
        err?.response?.data?.error ||
        (err?.response?.status === 401 ? "Invalid email or password" : null) ||
        err?.message ||
        "Unable to sign in. Please try again.";
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen w-full grid place-items-center bg-background text-foreground px-4">
      <div className="w-full max-w-md">
        <div className="flex items-center gap-3 justify-center mb-8">
          <div className="h-11 w-11 rounded-lg bg-gradient-gold grid place-items-center shadow-gold">
            <BellRing className="h-5 w-5 text-primary-foreground" />
          </div>
          <div>
            <div className="font-display text-2xl text-gradient-gold leading-none">RoomBoss</div>
            <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground mt-1">
              Hospitality OS
            </div>
          </div>
        </div>

        <div className="rounded-2xl bg-card hairline shadow-luxe p-8 relative overflow-hidden">
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-gold opacity-60" />
          <h1 className="font-display text-2xl">Welcome back</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Sign in to access your operations center.
          </p>

          <form onSubmit={onSubmit} className="mt-6 space-y-4">
            <div>
              <label className="text-[11px] uppercase tracking-wider text-muted-foreground">
                Email
              </label>
              <input
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1.5 w-full rounded-md bg-background hairline px-3 py-2.5 text-sm outline-none focus:ring-1 focus:ring-primary/60"
                placeholder="you@property.com"
              />
            </div>
            <div>
              <label className="text-[11px] uppercase tracking-wider text-muted-foreground">
                Password
              </label>
              <input
                type="password"
                required
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-1.5 w-full rounded-md bg-background hairline px-3 py-2.5 text-sm outline-none focus:ring-1 focus:ring-primary/60"
                placeholder="••••••••"
              />
            </div>

            {error && (
              <div className="flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs text-destructive">
                <AlertCircle className="h-4 w-4 mt-px shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="w-full inline-flex items-center justify-center gap-2 rounded-md bg-gradient-gold px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-gold disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
              {submitting ? "Signing in…" : "Sign in"}
            </button>
          </form>
        </div>

        <p className="text-center text-[11px] text-muted-foreground mt-6">
          Protected by enterprise-grade authentication.
        </p>
      </div>
    </div>
  );
}
