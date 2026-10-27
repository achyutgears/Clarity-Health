import { useEffect, useRef } from "react";
import { Link } from "@tanstack/react-router";
import { CalendarDays, FileText, MapPin, type LucideIcon } from "lucide-react";
import { Wordmark } from "@/components/brand";
import { cn } from "@/lib/utils";

const MAX_TILT_DEG = 5;

/**
 * Decorative, CSS-only depth composition for the auth pages: translucent planes, rings and
 * spheres at different translateZ depths with a slow float. On a fine pointer (and without
 * reduced motion) it tilts gently toward the cursor. Purely visual: aria-hidden, no pointer
 * events, transform-only animation.
 */
export function AuthBackdrop({
  variant = "ink",
  className,
}: {
  variant?: "ink" | "paper";
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || typeof window === "undefined" || typeof window.matchMedia !== "function") return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)");
    const fine = window.matchMedia("(hover: hover) and (pointer: fine)");
    if (reduce.matches || !fine.matches) return;

    let frame = 0;
    let x = 0;
    let y = 0;
    const clamp = (n: number) => Math.max(-1, Math.min(1, n));
    const apply = () => {
      frame = 0;
      const nx = clamp((x / window.innerWidth) * 2 - 1);
      const ny = clamp((y / window.innerHeight) * 2 - 1);
      el.style.setProperty("--bd-ty", `${(nx * MAX_TILT_DEG).toFixed(2)}deg`);
      el.style.setProperty("--bd-tx", `${(-ny * MAX_TILT_DEG * 0.8).toFixed(2)}deg`);
    };
    const onMove = (e: PointerEvent) => {
      if (e.pointerType !== "mouse" && e.pointerType !== "pen") return;
      x = e.clientX;
      y = e.clientY;
      if (!frame) frame = window.requestAnimationFrame(apply);
    };
    const onLeave = () => {
      if (frame) window.cancelAnimationFrame(frame);
      frame = 0;
      el.style.setProperty("--bd-tx", "0deg");
      el.style.setProperty("--bd-ty", "0deg");
    };
    const onMotionPref = () => {
      if (reduce.matches) onLeave();
    };

    window.addEventListener("pointermove", onMove, { passive: true });
    document.documentElement.addEventListener("pointerleave", onLeave);
    reduce.addEventListener?.("change", onMotionPref);
    return () => {
      if (frame) window.cancelAnimationFrame(frame);
      window.removeEventListener("pointermove", onMove);
      document.documentElement.removeEventListener("pointerleave", onLeave);
      reduce.removeEventListener?.("change", onMotionPref);
    };
  }, []);

  return (
    <div ref={ref} aria-hidden="true" data-variant={variant} className={cn("ch-bd", className)}>
      <div className="ch-bd-stage">
        <div className="ch-bd-layer ch-bd-glow" />
        <div className="ch-bd-layer ch-bd-floor" />
        <div className="ch-bd-layer ch-bd-orbit">
          <div className="ch-bd-orbit-spin">
            <span className="ch-bd-satellite" />
          </div>
        </div>
        <div className="ch-bd-layer ch-bd-orbit-2" />
        <div className="ch-bd-layer ch-bd-sphere-wrap">
          <div className="ch-bd-sphere" />
        </div>
        <div className="ch-bd-layer ch-bd-card-wrap">
          <div className="ch-bd-card">
            <span className="ch-bd-card-row">
              <span className="ch-bd-check" />
              <span className="ch-bd-line" style={{ width: "72%" }} />
            </span>
            <span className="ch-bd-card-row">
              <span className="ch-bd-check ch-bd-check-open" />
              <span className="ch-bd-line" style={{ width: "58%" }} />
            </span>
            <span className="ch-bd-card-row">
              <span className="ch-bd-check ch-bd-check-open" />
              <span className="ch-bd-line" style={{ width: "66%" }} />
            </span>
          </div>
        </div>
        <div className="ch-bd-layer ch-bd-grid-wrap">
          <div className="ch-bd-grid">
            {Array.from({ length: 8 }).map((_, i) => (
              <span key={i} className={i === 5 ? "ch-bd-cell ch-bd-cell-on" : "ch-bd-cell"} />
            ))}
          </div>
        </div>
        <div className="ch-bd-layer ch-bd-pin-wrap">
          <div className="ch-bd-pin" />
        </div>
        <div className="ch-bd-layer ch-bd-orb-wrap">
          <div className="ch-bd-orb" />
        </div>
        <div className="ch-bd-layer ch-bd-orb-2-wrap">
          <div className="ch-bd-orb-2" />
        </div>
      </div>
    </div>
  );
}

const VALUES: { icon: LucideIcon; title: string; body: string }[] = [
  {
    icon: MapPin,
    title: "Find care nearby",
    body: "Look up places to get care and open directions in the maps app you already use.",
  },
  {
    icon: CalendarDays,
    title: "Organize your care calendar",
    body: "Keep appointments and follow-ups together in one calm view.",
  },
  {
    icon: FileText,
    title: "Understand your instructions",
    body: "Break dense instructions into clear tasks, each traced to its source sentence.",
  },
];

/** The ink brand column used on the sign-in and reset-password pages. */
export function AuthBrandPanel({ className }: { className?: string }) {
  return (
    <aside
      aria-labelledby="auth-brand-heading"
      className={cn(
        "ch-ink-glow relative isolate overflow-hidden bg-ink text-ink-foreground",
        className,
      )}
    >
      <AuthBackdrop variant="ink" className="hidden lg:block" />
      <div className="relative z-10 flex h-full flex-col px-6 py-12 sm:px-10 lg:p-12">
        <Link
          to="/dashboard"
          aria-label="Clarity Health home"
          className="hidden w-fit rounded-md lg:inline-flex"
        >
          <Wordmark />
        </Link>
        <div className="max-w-md lg:mt-auto lg:pt-16">
          <p className="eyebrow text-sidebar-muted">Healthcare instructions, made clearer.</p>
          <h2
            id="auth-brand-heading"
            className="mt-4 font-display text-5xl leading-[0.95] tracking-tight lg:text-6xl xl:text-7xl"
          >
            Care, made <span className="italic text-sidebar-primary">clearer.</span>
          </h2>
          <p className="mt-5 text-sm leading-relaxed text-sidebar-muted">
            Clarity Health turns dense care instructions into plain, reviewable steps and keeps the
            rest of your care organized in one place.
          </p>
          <ul className="mt-8 space-y-5">
            {VALUES.map(({ icon: Icon, title, body }) => (
              <li key={title} className="flex gap-4">
                <span className="mt-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-sidebar-border bg-sidebar-accent/60 text-sidebar-primary">
                  <Icon className="h-4 w-4" aria-hidden />
                </span>
                <span>
                  <span className="block text-sm font-medium text-ink-foreground">{title}</span>
                  <span className="mt-0.5 block text-sm leading-relaxed text-sidebar-muted">
                    {body}
                  </span>
                </span>
              </li>
            ))}
          </ul>
          <p className="mt-10 border-t border-sidebar-border pt-5 text-xs leading-relaxed text-sidebar-muted">
            Clarity Health helps you read and organize information. It doesn't replace advice from
            your care team.
          </p>
        </div>
      </div>
    </aside>
  );
}
