import { Link, useRouterState } from "@tanstack/react-router";
import { useState, type ReactNode } from "react";
import {
  LayoutDashboard, FileText, Network, Camera, FlaskConical, MapPin, ShieldCheck, Menu, X,
} from "lucide-react";
import { cn } from "@/lib/utils";

export const navItems = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/instructions", label: "Instruction Studio", icon: FileText },
  { to: "/evidence", label: "Evidence Graph", icon: Network },
  { to: "/visual-check", label: "Visual Check", icon: Camera },
  { to: "/reliability", label: "Reliability Lab", icon: FlaskConical },
  { to: "/locations", label: "Locations", icon: MapPin },
  { to: "/privacy", label: "Privacy", icon: ShieldCheck },
] as const;

export function AppShell({ children }: { children: ReactNode }) {
  const path = useRouterState({ select: (s) => s.location.pathname });
  const [open, setOpen] = useState(false);

  const nav = (
    <nav aria-label="Primary" className="flex flex-col gap-0.5 px-3">
      {navItems.map(({ to, label, icon: Icon }) => {
        const active = path === to;
        return (
          <Link
            key={to}
            to={to}
            onClick={() => setOpen(false)}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors focus-visible:outline-sidebar-ring",
              active
                ? "bg-sidebar-accent text-sidebar-accent-foreground"
                : "text-sidebar-muted hover:bg-sidebar-accent/60 hover:text-sidebar-foreground",
            )}
          >
            <Icon className={cn("h-4 w-4", active && "text-sidebar-primary")} aria-hidden />
            {label}
          </Link>
        );
      })}
    </nav>
  );

  const brand = (
    <div className="px-6 py-6">
      <div className="font-display text-2xl text-sidebar-foreground">Clarity Health</div>
      <div className="mt-1 text-xs text-sidebar-muted">Healthcare instructions, made clearer.</div>
    </div>
  );

  return (
    <div className="flex min-h-screen w-full">
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col bg-sidebar lg:flex">
        {brand}
        {nav}
        <div className="mt-auto border-t border-sidebar-border px-6 py-4 text-xs text-sidebar-muted">
          Interface preview · synthetic data only
        </div>
      </aside>

      {open && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-sidebar/60" onClick={() => setOpen(false)} />
          <aside className="relative h-full w-64 bg-sidebar">
            <button
              aria-label="Close navigation"
              onClick={() => setOpen(false)}
              className="absolute right-3 top-3 rounded p-1 text-sidebar-foreground"
            >
              <X className="h-5 w-5" />
            </button>
            {brand}
            {nav}
          </aside>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-14 items-center gap-3 border-b bg-card px-4 lg:hidden">
          <button aria-label="Open navigation" onClick={() => setOpen(true)} className="rounded p-1">
            <Menu className="h-5 w-5" />
          </button>
          <span className="font-display text-lg">Clarity Health</span>
        </header>
        <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-8 md:px-8">{children}</main>
      </div>
    </div>
  );
}

export function PageHeader({ eyebrow, title, description, actions }: {
  eyebrow: string; title: string; description?: string; actions?: ReactNode;
}) {
  return (
    <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
      <div>
        <div className="eyebrow">{eyebrow}</div>
        <h1 className="mt-1 font-display text-3xl md:text-4xl">{title}</h1>
        {description && <p className="mt-2 max-w-2xl text-sm text-muted-foreground">{description}</p>}
      </div>
      {actions}
    </div>
  );
}

export function SyntheticBadge() {
  return (
    <span className="inline-flex items-center rounded-full border border-warning/40 bg-warning-soft px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider text-warning-foreground">
      Synthetic
    </span>
  );
}

export function Notice({ children, tone = "info" }: { children: ReactNode; tone?: "info" | "warning" }) {
  return (
    <div
      role="note"
      className={cn(
        "rounded-md border px-4 py-3 text-sm",
        tone === "warning"
          ? "border-warning/40 bg-warning-soft text-warning-foreground"
          : "border-primary/20 bg-teal-soft text-accent-foreground",
      )}
    >
      {children}
    </div>
  );
}
