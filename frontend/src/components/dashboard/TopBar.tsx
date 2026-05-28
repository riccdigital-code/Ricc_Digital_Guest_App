import { Search, Bell, Menu } from "lucide-react";
import { Link } from "@tanstack/react-router";

export function TopBar({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <header className="flex items-center justify-between gap-4 border-b border-border/60 bg-background/60 backdrop-blur px-4 lg:px-8 py-4">
      <div className="flex items-center gap-3 min-w-0">
        <Link to="/" className="lg:hidden h-9 w-9 grid place-items-center rounded-md bg-card hairline">
          <Menu className="h-4 w-4 text-primary" />
        </Link>
        <div className="min-w-0">
          <h1 className="font-display text-2xl lg:text-3xl truncate">{title}</h1>
          {subtitle && (
            <p className="text-xs lg:text-sm text-muted-foreground truncate">{subtitle}</p>
          )}
        </div>
      </div>
      <div className="flex items-center gap-2 lg:gap-3">
        <div className="hidden md:flex items-center gap-2 rounded-md bg-card px-3 py-2 hairline w-72">
          <Search className="h-4 w-4 text-muted-foreground" />
          <input
            placeholder="Search rooms, guests, requests…"
            className="bg-transparent outline-none text-sm flex-1 placeholder:text-muted-foreground"
          />
        </div>
        <button className="relative h-10 w-10 grid place-items-center rounded-md bg-card hairline hover:bg-accent transition-colors">
          <Bell className="h-4 w-4 text-primary" />
          <span className="absolute top-2 right-2 h-2 w-2 rounded-full bg-destructive" />
        </button>
        <div className="h-10 w-10 rounded-full bg-gradient-gold grid place-items-center text-primary-foreground text-sm font-semibold shadow-gold">
          ÉM
        </div>
      </div>
    </header>
  );
}
