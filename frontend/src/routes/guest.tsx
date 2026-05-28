import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { TopBar } from "@/components/dashboard/TopBar";
import { Panel } from "@/components/dashboard/Primitives";
import { Sparkles, Bath, BedDouble, UtensilsCrossed, Wrench, Check } from "lucide-react";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/guest")({
  head: () => ({ meta: [{ title: "Guest Requests — RoomBoss" }] }),
  component: Guest,
});

type Cat = "towels" | "cleaning" | "food" | "maintenance";

const services: { id: Cat; icon: typeof Bath; title: string; subtitle: string; options: string[] }[] = [
  { id: "towels",     icon: Bath,              title: "Fresh Towels",   subtitle: "Plush Egyptian cotton, delivered in minutes", options: ["Bath", "Hand", "Pool", "Robe & Slippers"] },
  { id: "cleaning",   icon: BedDouble,         title: "Housekeeping",   subtitle: "Turndown, refresh or full service",          options: ["Quick Refresh", "Full Turndown", "Deep Clean", "Linen Change"] },
  { id: "food",       icon: UtensilsCrossed,   title: "In-Room Dining", subtitle: "Curated by our Michelin-trained kitchen",    options: ["Breakfast", "Lunch", "Dinner", "Champagne Service"] },
  { id: "maintenance",icon: Wrench,            title: "Maintenance",    subtitle: "Discreet, swift, white-glove repairs",       options: ["Climate Control", "Lighting", "Plumbing", "Electronics"] },
];

function Guest() {
  const [active, setActive] = useState<Cat>("towels");
  const [selected, setSelected] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [sent, setSent] = useState(false);

  const svc = services.find(s => s.id === active)!;

  const submit = () => {
    // POST `${VITE_API_URL}/api/requests` — see src/lib/api.ts
    setSent(true);
    setTimeout(() => { setSent(false); setSelected(null); setNote(""); }, 2200);
  };

  return (
    <>
      <TopBar title="Welcome, Mr. Laurent" subtitle="Suite 1402 · The Aurelian — Paris" />
      <div className="p-4 lg:p-8 max-w-5xl mx-auto w-full space-y-6">
        <div className="rounded-2xl bg-gradient-dark hairline shadow-luxe p-6 lg:p-8 relative overflow-hidden">
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-gold opacity-70" />
          <div className="flex items-center gap-2 text-primary text-xs uppercase tracking-[0.2em]">
            <Sparkles className="h-3.5 w-3.5" /> At Your Service
          </div>
          <h2 className="font-display text-3xl lg:text-4xl mt-2">How may we delight you today?</h2>
          <p className="text-muted-foreground mt-1">Average response time under 7 minutes.</p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {services.map((s) => (
            <button key={s.id} onClick={() => { setActive(s.id); setSelected(null); }}
              className={cn(
                "rounded-xl p-5 text-left transition-all bg-card hairline group",
                active === s.id ? "ring-gold shadow-gold -translate-y-0.5" : "hover:bg-accent/40"
              )}>
              <div className={cn(
                "h-11 w-11 rounded-lg grid place-items-center mb-3",
                active === s.id ? "bg-gradient-gold text-primary-foreground" : "bg-accent/50 text-primary"
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
                  selected === o ? "bg-gradient-gold text-primary-foreground shadow-gold" : "bg-background/50 hover:bg-accent/40"
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
            <button disabled={!selected || sent} onClick={submit}
              className={cn(
                "rounded-md px-5 py-2.5 text-sm font-semibold shadow-gold transition-all inline-flex items-center gap-2",
                sent ? "bg-success text-success-foreground" : "bg-gradient-gold text-primary-foreground",
                (!selected || sent) && "opacity-90"
              )}>
              {sent ? <><Check className="h-4 w-4" /> Request Confirmed</> : "Send Request"}
            </button>
          </div>
        </Panel>
      </div>
    </>
  );
}
