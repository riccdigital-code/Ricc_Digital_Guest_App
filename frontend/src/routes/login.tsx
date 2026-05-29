import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { BellRing, Loader2, AlertCircle, KeyRound, BedDouble } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { ROLE_HOME } from "@/lib/auth-config";
import { guestApi } from "@/lib/guest-api";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/login")({
  head: () => ({ meta: [{ title: "Sign in — RoomBoss" }] }),
  component: LoginPage,
});

type Mode = "staff" | "guest";

function mapAuthError(err: any): string {
  const status = err?.response?.status;
  const data = err?.response?.data;
  const code: string | undefined = data?.code;
  const apiMsg: string | undefined = data?.message || data?.error;

  if (status === 429 || code === "RATE_LIMITED") {
    return "Too many login attempts. Please wait a moment and try again.";
  }
  if (status === 401 || code === "INVALID_CREDENTIALS") {
    return "Invalid email or password.";
  }
  if (status === 403 || code === "FORBIDDEN_ROLE") {
    return "Your account does not have access to this portal.";
  }
  if (code === "SESSION_EXPIRED" || code === "TOKEN_EXPIRED") {
    return "Your session has expired. Please sign in again.";
  }
  if (status === 423 || code === "ACCOUNT_LOCKED") {
    return "Account locked. Contact your administrator.";
  }
  if (code === "INVALID_ROOM" || code === "INVALID_ACCESS_CODE") {
    return "Room number or access code is incorrect.";
  }
  if (code === "SESSION_INACTIVE") {
    return "No active stay for this room. Please contact reception.";
  }
  if (!err?.response) {
    return "Cannot reach authentication service. Check your connection.";
  }
  return apiMsg || "Unable to sign in. Please try again.";
}

function LoginPage() {
  const { login, setSession } = useAuth();
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("staff");

  // Staff form
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  // Guest form
  const [room, setRoom] = useState("");
  const [accessCode, setAccessCode] = useState("");

  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function onStaffSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const user = await login(email.trim(), password);
      router.navigate({ to: ROLE_HOME[user.role] ?? "/" });
    } catch (err: any) {
      setError(mapAuthError(err));
    } finally {
      setSubmitting(false);
    }
  }

  async function onGuestSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const res = await guestApi.login(room.trim(), accessCode.trim());
      setSession(res.user, res.token);
      router.navigate({ to: "/guest" });
    } catch (err: any) {
      setError(mapAuthError(err));
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

          <div className="grid grid-cols-2 gap-1 p-1 rounded-md bg-background/50 hairline mb-6">
            {(["staff", "guest"] as Mode[]).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => { setMode(m); setError(null); }}
                className={cn(
                  "py-2 text-xs font-semibold uppercase tracking-wider rounded-sm transition-all",
                  mode === m
                    ? "bg-gradient-gold text-primary-foreground shadow-gold"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {m === "staff" ? "Staff & Admin" : "Guest"}
              </button>
            ))}
          </div>

          {mode === "staff" ? (
            <>
              <h1 className="font-display text-2xl">Welcome back</h1>
              <p className="text-sm text-muted-foreground mt-1">Sign in to access your operations center.</p>
              <form onSubmit={onStaffSubmit} className="mt-6 space-y-4">
                <Field label="Email">
                  <input type="email" required autoComplete="email"
                    value={email} onChange={(e) => setEmail(e.target.value)}
                    className={inputCls} placeholder="you@property.com" />
                </Field>
                <Field label="Password">
                  <input type="password" required autoComplete="current-password"
                    value={password} onChange={(e) => setPassword(e.target.value)}
                    className={inputCls} placeholder="••••••••" />
                </Field>
                {error && <ErrorBox msg={error} />}
                <SubmitButton submitting={submitting} label="Sign in" />
              </form>
            </>
          ) : (
            <>
              <h1 className="font-display text-2xl">At your service</h1>
              <p className="text-sm text-muted-foreground mt-1">
                Access in-room concierge with your room number and access code.
              </p>
              <form onSubmit={onGuestSubmit} className="mt-6 space-y-4">
                <Field label="Room number" icon={<BedDouble className="h-3.5 w-3.5" />}>
                  <input required inputMode="numeric" value={room}
                    onChange={(e) => setRoom(e.target.value)}
                    className={inputCls} placeholder="e.g. 1402" />
                </Field>
                <Field label="Access code" icon={<KeyRound className="h-3.5 w-3.5" />}>
                  <input required value={accessCode}
                    onChange={(e) => setAccessCode(e.target.value)}
                    className={inputCls} placeholder="Provided at check-in" />
                </Field>
                {error && <ErrorBox msg={error} />}
                <SubmitButton submitting={submitting} label="Enter concierge" />
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

const inputCls =
  "mt-1.5 w-full rounded-md bg-background hairline px-3 py-2.5 text-sm outline-none focus:ring-1 focus:ring-primary/60";

function Field({ label, icon, children }: { label: string; icon?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div>
      <label className="text-[11px] uppercase tracking-wider text-muted-foreground inline-flex items-center gap-1.5">
        {icon}{label}
      </label>
      {children}
    </div>
  );
}

function ErrorBox({ msg }: { msg: string }) {
  return (
    <div className="flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs text-destructive">
      <AlertCircle className="h-4 w-4 mt-px shrink-0" />
      <span>{msg}</span>
    </div>
  );
}

function SubmitButton({ submitting, label }: { submitting: boolean; label: string }) {
  return (
    <button type="submit" disabled={submitting}
      className="w-full inline-flex items-center justify-center gap-2 rounded-md bg-gradient-gold px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-gold disabled:opacity-60 disabled:cursor-not-allowed">
      {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
      {submitting ? "Please wait…" : label}
    </button>
  );
}
