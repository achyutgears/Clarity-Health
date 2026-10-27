import { Link } from "@tanstack/react-router";
import {
  ArrowUpRight,
  Bell,
  CalendarDays,
  CircleHelp,
  Leaf,
  Loader2,
  MapPin,
  Plus,
  Puzzle,
  Wind,
} from "lucide-react";
import { EVENT_KIND_LABELS, upcoming, useCalendar, type CareEvent } from "@/lib/calendar";
import { reminderLabel } from "@/lib/calendar/types";

const dayFmt = new Intl.DateTimeFormat(undefined, { weekday: "short" });
const dateFmt = new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric" });
const timeFmt = new Intl.DateTimeFormat(undefined, { hour: "numeric", minute: "2-digit" });

/** Dashboard band answering: what's coming up, where can I find care, where can I take a break. */
export function CareOverview() {
  return (
    <section aria-label="Your care" className="grid animate-rise gap-6 lg:grid-cols-[1.5fr_1fr]">
      <UpcomingCard />
      <div className="grid gap-6">
        <Link
          to="/locations"
          className="surface group flex flex-col p-6 transition-colors hover:border-primary/50"
        >
          <div className="flex items-center justify-between">
            <span className="grid h-10 w-10 place-items-center rounded-full bg-teal-soft text-accent-foreground">
              <MapPin className="h-5 w-5" aria-hidden />
            </span>
            <ArrowUpRight
              className="h-4 w-4 text-muted-foreground transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-primary"
              aria-hidden
            />
          </div>
          <h2 className="mt-4 font-display text-3xl leading-none">Find nearby care</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Hospitals, clinics and urgent care around you, from public map data, with directions.
          </p>
        </Link>
        <Link
          to="/mindful"
          className="surface group relative flex flex-col overflow-hidden p-6 transition-colors hover:border-primary/50"
        >
          <span
            aria-hidden
            className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-teal-soft opacity-70 transition-transform duration-700 group-hover:scale-110"
          />
          <div className="relative flex items-center justify-between">
            <span className="grid h-10 w-10 place-items-center rounded-full bg-ink text-ink-foreground">
              <Leaf className="h-5 w-5" aria-hidden />
            </span>
            <ArrowUpRight
              className="h-4 w-4 text-muted-foreground transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-primary"
              aria-hidden
            />
          </div>
          <h2 className="relative mt-4 font-display text-3xl leading-none">Mindful Moments</h2>
          <p className="relative mt-2 text-sm text-muted-foreground">
            Take a little break for yourself.
          </p>
          <ul className="relative mt-4 flex flex-wrap gap-2 text-xs text-muted-foreground">
            <li className="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1">
              <CircleHelp className="h-3.5 w-3.5" aria-hidden /> Quick Quiz
            </li>
            <li className="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1">
              <Puzzle className="h-3.5 w-3.5" aria-hidden /> Brain Teasers
            </li>
            <li className="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1">
              <Wind className="h-3.5 w-3.5" aria-hidden /> Calm Break
            </li>
          </ul>
        </Link>
      </div>
    </section>
  );
}

function UpcomingCard() {
  const { events, status, error, storage } = useCalendar();
  const next = status === "ready" ? upcoming(events, new Date(), 4) : [];

  return (
    <article className="surface flex flex-col p-6" aria-labelledby="upcoming-heading">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="grid h-10 w-10 place-items-center rounded-full bg-teal-soft text-accent-foreground">
            <CalendarDays className="h-5 w-5" aria-hidden />
          </span>
          <h2 id="upcoming-heading" className="font-display text-3xl leading-none">
            Coming up
          </h2>
        </div>
        {status === "ready" && (
          <span className="eyebrow">
            {storage === "cloud" ? "Synced to your account" : "Saved in this browser"}
          </span>
        )}
      </div>

      <div className="mt-5 flex flex-1 flex-col" aria-live="polite">
        {status === "loading" ? (
          <p className="inline-flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> Loading your calendar…
          </p>
        ) : status === "error" ? (
          <p role="alert" className="text-sm text-destructive">
            Couldn’t load your calendar{error ? `: ${error}` : "."}
          </p>
        ) : next.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-4 rounded-md border border-dashed p-6 text-center">
            <CalendarDays className="h-8 w-8 text-primary/60" aria-hidden />
            <p className="max-w-sm text-sm text-muted-foreground">
              Nothing coming up. Add an appointment you’re tracking, a health task, or a medication
              reminder.
            </p>
            <Link
              to="/calendar"
              className="inline-flex h-10 items-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
            >
              <Plus className="h-4 w-4" aria-hidden /> Add a care entry
            </Link>
          </div>
        ) : (
          <ul className="divide-y border-y">
            {next.map((e) => (
              <UpcomingRow key={e.id} event={e} />
            ))}
          </ul>
        )}
      </div>

      <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
        <Link
          to="/calendar"
          className="inline-flex items-center gap-1 text-sm font-medium text-accent-foreground underline-offset-4 hover:underline"
        >
          Open My Care Calendar <ArrowUpRight className="h-4 w-4" aria-hidden />
        </Link>
        <p className="text-xs text-muted-foreground">
          Personal entries, not clinic bookings. Reminders show in the app only.
        </p>
      </div>
    </article>
  );
}

function UpcomingRow({ event }: { event: CareEvent }) {
  const start = new Date(event.startsAt);
  return (
    <li className="flex items-start gap-4 py-3">
      <div className="w-14 shrink-0 text-center">
        <div className="eyebrow">{dayFmt.format(start)}</div>
        <div className="font-display text-2xl leading-tight">{start.getDate()}</div>
      </div>
      <div className="min-w-0 flex-1">
        <div className="truncate font-medium">{event.title}</div>
        <div className="mt-0.5 text-sm text-muted-foreground">
          {dateFmt.format(start)} · {timeFmt.format(start)}
          {event.location ? ` · ${event.location}` : ""}
        </div>
        <div className="mt-1.5 flex flex-wrap gap-2 text-xs">
          <span className="rounded bg-secondary px-2 py-0.5">{EVENT_KIND_LABELS[event.kind]}</span>
          {event.reminderMinutes !== null && (
            <span className="inline-flex items-center gap-1 text-muted-foreground">
              <Bell className="h-3 w-3" aria-hidden /> {reminderLabel(event.reminderMinutes)}
            </span>
          )}
        </div>
      </div>
    </li>
  );
}
