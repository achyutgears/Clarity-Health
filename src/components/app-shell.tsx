import { Link, useRouterState } from "@tanstack/react-router";
import { useState, type ReactNode } from "react";
import { Menu, X, LogOut, LogIn } from "lucide-react";
import { cn } from "@/lib/utils";
import { Wordmark } from "@/components/brand";
import { SignInDialog } from "@/components/sign-in-dialog";
import { useAuth } from "@/lib/auth";

export const navItems = [
  { to: "/dashboard", label: "Overview", num: "00" },
  { to: "/instructions", label: "Instruction Studio", num: "01" },
  { to: "/evidence", label: "Evidence Graph", num: "02" },
  { to: "/visual-check", label: "Visual Check", num: "03" },
  { to: "/reliability", label: "Reliability Lab", num: "04" },
  { to: "/locations", label: "Locations", num: "05" },
  { to: "/privacy", label: "Privacy", num: "06" },
] as const;

const BARE_ROUTES = ["/sign-in", "/reset-password"];

export function AppShell({ children }: { children: ReactNode }) {
  const path = useRouterState({ select: (s) => s.location.pathname });
  const [open, setOpen] = useState(false);
  const { user, ready, signOut } = useAuth();

  if (BARE_ROUTES.includes(path)) return <>{children}<SignInDialog /></>;

  const nav = (
    <nav aria-label="Primary" className="flex flex-col px-4">
      {navItems.map(({ to, label, num }) => {
        const active = path === to;
        return (
          <Link
            key={to}
            to={to}
            onClick={() => setOpen(false)}
            aria-current={active ? "page" : undefined}
            className={cn(
              "group relative flex items-baseline gap-3 border-b border-sidebar-border/60 py-3 pl-3 text-[0.95rem] transition-colors focus-visible:outline-sidebar-ring",
              active ? "text-sidebar-accent-foreground" : "text-sidebar-muted hover:text-sidebar-foreground",
            )}
          >
            <span className={cn("absolute left-0 top-3 bottom-3 w-0.5 rounded-full transition-colors", active ? "bg-sidebar-primary" : "bg-transparent")} />
            <span className={cn("font-mono text-[10px]", active ? "text-sidebar-primary" : "text-sidebar-muted/70")}>{num}</span>
            {label}
          </Link>
        );
      })}
    </nav>
  );

  const account = (
    <div className="border-t border-sidebar-border px-6 py-5 text-sm">
      {!ready ? (
        <span className="text-sidebar-muted">Checking session…</span>
      ) : user ? (
        <div className="space-y-2">
          <div className="eyebrow text-sidebar-muted">Signed in</div>
          <div className="truncate text-sidebar-foreground">{user.email}</div>
          <button onClick={signOut} className="inline-flex items-center gap-2 text-sidebar-muted hover:text-sidebar-foreground">
            <LogOut className="h-3.5 w-3.5" /> Sign out
          </button>
        </div>
      ) : (
        <Link to="/sign-in" className="inline-flex items-center gap-2 text-sidebar-foreground hover:text-sidebar-primary">
          <LogIn className="h-4 w-4" /> Sign in
        </Link>
      )}
    </div>
  );

  const brand = (
    <div className="px-6 pb-8 pt-7 text-sidebar-foreground">
      <Link to="/dashboard" aria-label="Clarity Health home"><Wordmark /></Link>
      <div className="mt-3 text-xs leading-relaxed text-sidebar-muted">Healthcare instructions,<br />made clearer.</div>
    </div>
  );

  return (
    <div className="flex min-h-screen w-full">
      <aside className="sticky top-0 hidden h-screen w-72 shrink-0 flex-col bg-sidebar lg:flex">
        {brand}
        {nav}
        <div className="mt-auto">{account}</div>
      </aside>

      {open && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-ink/60" onClick={() => setOpen(false)} />
          <aside className="relative flex h-full w-72 flex-col bg-sidebar">
            <button aria-label="Close navigation" onClick={() => setOpen(false)} className="absolute right-3 top-3 rounded p-1 text-sidebar-foreground">
              <X className="h-5 w-5" />
            </button>
            {brand}
            {nav}
            <div className="mt-auto">{account}</div>
          </aside>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-14 items-center gap-3 bg-sidebar px-4 text-sidebar-foreground lg:hidden">
          <button aria-label="Open navigation" onClick={() => setOpen(true)} className="rounded p-1">
            <Menu className="h-5 w-5" />
          </button>
          <Wordmark className="scale-90" />
        </header>
        <main className="mx-auto w-full max-w-[84rem] flex-1 px-5 py-10 md:px-12 md:py-14">{children}</main>
      </div>
      <SignInDialog />
    </div>
  );
}

export function PageHeader({ eyebrow, title, description, actions }: {
  eyebrow: string; title: string; description?: string; actions?: ReactNode;
}) {
  return (
    <header className="mb-10 animate-rise">
      <div className="flex items-center gap-3">
        <span className="eyebrow">{eyebrow}</span>
        <span className="h-px flex-1 bg-border" />
      </div>
      <div className="mt-4 flex flex-wrap items-end justify-between gap-6">
        <div className="max-w-3xl">
          <h1 className="font-display text-5xl leading-[0.95] tracking-tight md:text-6xl">{title}</h1>
          {description && <p className="mt-4 max-w-2xl text-[0.95rem] leading-relaxed text-muted-foreground">{description}</p>}
        </div>
        {actions}
      </div>
    </header>
  );
}

export function SyntheticBadge() {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-warning/40 bg-warning-soft px-2.5 py-0.5 font-mono text-[10px] uppercase tracking-wider text-warning-foreground">
      <span className="h-1.5 w-1.5 rounded-full bg-warning" /> Synthetic data
    </span>
  );
}

export function Notice({ children, tone = "info" }: { children: ReactNode; tone?: "info" | "warning" }) {
  return (
    <div
      role="note"
      className={cn(
        "border-l-2 px-4 py-3 text-sm leading-relaxed",
        tone === "warning" ? "border-warning bg-warning-soft text-warning-foreground" : "border-primary bg-teal-soft text-accent-foreground",
      )}
    >
      {children}
    </div>
  );
}
