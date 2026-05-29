import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { TopBar } from "@/components/dashboard/TopBar";
import { Panel, StatusPill } from "@/components/dashboard/Primitives";
import { Sparkles, Bath, BedDouble, UtensilsCrossed, Wrench, Check, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { guestApi, type GuestRequest, type GuestSession } from "@/lib/guest-api";

export const Route = createFileRoute("/guest")({
  head: () => ({ meta: [{ title: "Guest Requests — RoomBoss" }] }),
  component: Guest,
});

type Cat = "towels" | "cleaning" | "food" | "maintenance";

const services: { id: Cat; icon: typeof Bath; title: string; subtitle: string; options: string[] }[] = [
  { id: "towels",      icon: Bath,            title: "Fresh Towels",   subtitle: "Plush Egyptian cotton, delivered in minutes", options: ["Bath", "Hand", "Pool", "Robe & Slippers"] },
  { id: "cleaning",    icon: BedDouble,       title: "Housekeeping",   subtitle: "Turndown, refresh or full service",          options: ["Quick Refresh", "Full Turndown", "Deep Clean", "Linen Change"] },
  { id: "food",        icon: UtensilsCrossed, title: "In-Room Dining", subtitle: "Curated by our Michelin-trained kitchen",    options: ["Breakfast", "Lunch", "Dinner", "Champagne Service"] },
  { id: "maintenance", icon: Wrench,          title: "Maintenance",    subtitle: "Discreet, swift, white-glove repairs",       options: ["Climate Control", "Lighting", "Plumbing", "Electronics"] },
];

function Guest() {
  const { user } = useAuth();
  const [active, setActive] = useState<Cat>("towels");
  const [selected, setSelected] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [justSent, setJustSent] = useState(false);
  const [session, setSession] = useState<GuestSession | null>(null);
  const [requests, setRequests] = useState<GuestRequest[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);

  const svc = services.find((s) => s.id === active)!;

  const loadRequests = async () => {
    try {
      const r = await guestApi.myRequests();
      setRequests(r);
    } catch (e: any) {
      // silent — keep existing list
    }
  };

  useEffect(() => {
    (async () => {
      try {
        const s = await guestApi.session();
        setSession(s);
      } catch (e: any) {
        setLoadError(e?.response?.data?.message ?? null);
      }
    })();
    void loadRequests();
  }, []);

  const submit = async () => {
    if (!selected) return;
    setSubmitting(true);
    try {
      const created = await guestApi.createRequest({
        category: svc.id,
        option: selected,
        note: note.trim() || undefined,
      });
      setRequests((curr) => [created, ...curr]);
      setJustSent(true);
      toast.success("Request sent", { description: `${svc.title} — ${selected}` });
      setTimeout(() => { setJustSent(false); setSelected(null); setNote(""); }, 2000);
    } catch (e: any) {
      const m = e?.response?.data?.message ?? e?.message ?? "Could not send request";
      toast.error(m);
    } finally {
      setSubmitting(false);
    }
  };

  const headerName  = session?.guestName ?? user?.name ?? "Guest";
  const headerSubt  = session
    ? `Suite ${session.roomNumber}${session.propertyName ? ` · ${session.propertyName}` : ""}`
    : "In-room concierge";

  return (
    <>
      <TopBar title={`Welcome, ${headerName}`} subtitle={headerSubt} />
      <div className="p-4 lg:p-8 max-w-5xl mx-auto w-full space-y-6">
        <div className="rounded-2xl bg-gradient-dark hairline shadow-luxe p-6 lg:p-8 relative overflow-hidden">
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-gold opacity-70" />
          <div className="flex items-center gap-2 text-primary text-xs uppercase tracking-[0.2em]">
            <Sparkles className="h-3.5 w-3.5" /> At Your Service
          </div>
          <h2 className="font-display text-3xl lg:text-4xl mt-2">How may we delight you today?</h2>
          <p className="text-muted-foreground mt-1">Average response time under 7 minutes.</p>
        </div>

        {loadError && (
          <div className="rounded-md bg-warning/10 text-warning text-xs px-3 py-2 hairline">
            {loadError}
          </div>
        )}

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {services.map((s) => (
            <button key={s.id} onClick={() => { setActive(s.id); setSelected(null); }}
              className={cn(
                "rounded-xl p-5 text-left transition-all bg-card hairline group",
                active === s.id ? "ring-gold shadow-gold -translate-y-0.5" : "hover:bg-accent/40",
              )}>
              <div className={cn(
                "h-11 w-11 rounded-lg grid place-items-center mb-3",
                active === s.id ? "bg-gradient-gold text-primary-foreground" : "bg-accent/50 text-primary",
              )}>
                <s.icon className="h-5 w-5" />
              </div>
              <div className="font-display text-lg">{s.title}</div>
              <div className="text-xs text-muted-foreground mt-1">{s.subtitle}</div>
            </button>
          ))}
        </div>

        <Panel title={`Request — ${svc.title}`}>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {svc.options.map((o) => (
              <button key={o} onClick={() => setSelected(o)}
                className={cn(
                  "rounded-lg px-4 py-3 text-sm text-left transition-colors hairline",
                  selected === o ? "bg-gradient-gold text-primary-foreground shadow-gold" : "bg-background/50 hover:bg-accent/40",
                )}>
                {o}
              </button>
            ))}
          </div>

          <div className="mt-5">
            <label className="text-xs uppercase tracking-wider text-muted-foreground">Special instructions</label>
            <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={3}
              placeholder="e.g. Please leave outside, do not disturb."
              className="mt-2 w-full rounded-lg bg-background/50 hairline px-4 py-3 text-sm outline-none focus:ring-gold" />
          </div>

          <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
            <div className="text-xs text-muted-foreground">
              {selected ? <>Sending: <span className="text-primary">{selected}</span></> : "Choose an option to continue"}
            </div>
            <button disabled={!selected || submitting || justSent} onClick={submit}
              className={cn(
                "rounded-md px-5 py-2.5 text-sm font-semibold shadow-gold transition-all inline-flex items-center gap-2",
                justSent ? "bg-success text-success-foreground" : "bg-gradient-gold text-primary-foreground",
                (!selected || submitting || justSent) && "opacity-90",
              )}>
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : justSent ? <Check className="h-4 w-4" /> : null}
              {submitting ? "Sending…" : justSent ? "Request Confirmed" : "Send Request"}
            </button>
          </div>
        </Panel>

        <Panel title="Your Requests">
          {requests.length === 0 ? (
            <div className="py-6 text-center text-sm text-muted-foreground">No requests yet — start above.</div>
          ) : (
            <ul className="space-y-2">
              {requests.map((r) => (
                <li key={r.id} className="flex items-center justify-between gap-3 rounded-lg bg-background/50 hairline px-4 py-3">
                  <div className="min-w-0">
                    <div className="text-sm font-medium capitalize">{r.category} · {r.option}</div>
                    {r.note && <div className="text-xs text-muted-foreground truncate">{r.note}</div>}
                  </div>
                  <StatusPill status={r.status} />
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>
    </>
  );
}
