import { startOfDay } from "date-fns";
import { Notice } from "@/components/app-shell";
import {
  formatDayLong,
  groupByDay,
  isSameDay,
  relativeDayLabel,
  upcoming,
  type CareEvent,
} from "@/lib/calendar";
import { EventCard } from "./event-card";

export function AgendaView({
  anchor,
  now,
  events,
  disabled,
  onEdit,
  onDelete,
}: {
  anchor: Date;
  now: Date;
  events: CareEvent[];
  disabled: boolean;
  onEdit: (e: CareEvent) => void;
  onDelete: (e: CareEvent) => void;
}) {
  // From "now" when looking at today (hides what's already over), otherwise from the day's start.
  const from = isSameDay(anchor, now) ? now : startOfDay(anchor);
  const groups = groupByDay(upcoming(events, from));

  if (groups.length === 0) {
    return (
      <Notice>
        No entries from {formatDayLong(from)} onward. Use “Add entry” to track an appointment, task,
        or reminder.
      </Notice>
    );
  }

  return (
    <div className="space-y-8">
      {groups.map((g) => (
        <section key={g.key} aria-labelledby={`agenda-${g.key}`}>
          <h3
            id={`agenda-${g.key}`}
            className="flex flex-wrap items-baseline gap-x-3 border-b border-foreground pb-2"
          >
            <span className="font-display text-2xl">{relativeDayLabel(g.date, now)}</span>
            <span className="eyebrow">{formatDayLong(g.date)}</span>
          </h3>
          <ul className="mt-3 space-y-3">
            {g.events.map((e) => (
              <li key={e.id}>
                <EventCard
                  event={e}
                  now={now}
                  headingLevel={4}
                  disabled={disabled}
                  onEdit={onEdit}
                  onDelete={onDelete}
                />
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
