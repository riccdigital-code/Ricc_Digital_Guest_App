import { cn } from "@/lib/utils";
import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import type { ReactNode } from "react";

export function MetricCard({
  label,
  value,
  delta,
  trend = "up",
  icon,
}: {
  label: string;
  value: string;
  delta?: string;
  trend?: "up" | "down";
  icon?: ReactNode;
}) {
  return (
    <div className="rounded-xl p-5 bg-card hairline shadow-luxe relative overflow-hidden group">
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-gold opacity-60" />
      <div className="flex items-start justify-between">
        <div>
          <div className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
            {label}
          </div>
          <div className="mt-2 font-display text-3xl text-gradient-gold">{value}</div>
        </div>
        {icon && (
          <div className="h-10 w-10 rounded-md grid place-items-center bg-accent/40 text-primary">
            {icon}
          </div>
        )}
      </div>
      {delta && (
        <div
          className={cn(
            "mt-3 inline-flex items-center gap-1 text-xs",
            trend === "up" ? "text-success" : "text-destructive",
          )}
        >
          {trend === "up" ? (
            <ArrowUpRight className="h-3.5 w-3.5" />
          ) : (
            <ArrowDownRight className="h-3.5 w-3.5" />
          )}
          {delta}
        </div>
      )}
    </div>
  );
}

export function Panel({
  title,
  action,
  children,
  className,
}: {
  title: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("rounded-xl bg-card hairline shadow-luxe", className)}>
      <div className="flex items-center justify-between px-5 py-4 border-b border-border/60">
        <h3 className="font-display text-lg">{title}</h3>
        {action}
      </div>
      <div className="p-5">{children}</div>
    </section>
  );
}

export function StatusPill({ status }: { status: string }) {
  const map: Record<string, string> = {
    in_progress: "bg-primary/15 text-primary ring-gold",
    queued: "bg-muted text-muted-foreground",
    completed: "bg-success/15 text-success",
    escalated: "bg-destructive/15 text-destructive",
    operational: "bg-success/15 text-success",
    attention: "bg-warning/15 text-warning",
    critical: "bg-destructive/15 text-destructive",
    high: "bg-warning/15 text-warning",
    medium: "bg-muted text-muted-foreground",
    vip: "bg-gradient-gold text-primary-foreground",
    normal: "bg-muted text-muted-foreground",
    warning: "bg-warning/15 text-warning",
    info: "bg-primary/10 text-primary",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-medium uppercase tracking-wider",
        map[status] ?? "bg-muted text-muted-foreground",
      )}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current opacity-80" />
      {status.replace("_", " ")}
    </span>
  );
}
