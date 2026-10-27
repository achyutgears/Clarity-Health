import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  EVENT_KIND_LABELS,
  eventsOnDay,
  formatDayLong,
  formatEventTime,
  isReminderDue,
  relativeDayLabel,
  upcoming,
  type CareEvent,
} from "@/lib/calendar";
import { cn } from "@/lib/utils";
import { EventCard, ReminderDueBadge } from "./event-card";
import { KIND_META, KindIcon } from "./kind";

export function DayPanel({
  date,
  dateKey,
  now,
  events,
  disabled,
  onAdd,
  onEdit,
  onDelete,
}: {
  date: Date;
  dateKey: string;
  now: Date;
  events: CareEvent[];
  disabled: boolean;
  onAdd: (dateKey: string) => void;
  onEdit: (e: CareEvent) => void;
  onDelete: (e: CareEvent) => void;
}) {
  const list = eventsOnDay(events, dateKey);
  return (
    <section aria-labelledby="day-panel-title" className="rule-top">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="eyebrow">{relativeDayLabel(date, now)}</div>
          <h2 id="day-panel-title" className="mt-1 font-display text-2xl leading-tight">
            {formatDayLong(date)}
          </h2>
        </div>
        <Button className="h-10" onClick={() => onAdd(dateKey)} disabled={disabled}>
          <Plus aria-hidden="true" /> Add entry
        </Button>
      </div>
      <div>
        {list.length === 0 ? (
          <p className="mt-4 text-sm text-muted-foreground">Nothing on this day yet.</p>
        ) : (
          <ul className="mt-4 space-y-3">
            {list.map((e) => (
              <li key={e.id}>
                <EventCard
                  event={e}
                  now={now}
                  disabled={disabled}
                  onEdit={onEdit}
                  onDelete={onDelete}
                />
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}

export function UpcomingPanel({
  now,
  events,
  onSelect,
}: {
  now: Date;
  events: CareEvent[];
  onSelect: (e: CareEvent) => void;
}) {
  const next = upcoming(events, now, 5);
  return (
    <section aria-labelledby="upcoming-title" className="rule-top">
      <h2 id="upcoming-title" className="font-display text-2xl">
        Upcoming
      </h2>
      {next.length === 0 ? (
        <p className="mt-3 text-sm text-muted-foreground">
          No upcoming entries. Anything you add for later today or after shows up here.
        </p>
      ) : (
        <ol className="mt-3 divide-y divide-border border-y border-border">
          {next.map((e) => {
            const start = new Date(e.startsAt);
            return (
              <li key={e.id}>
                <button
                  type="button"
                  onClick={() => onSelect(e)}
                  className="flex min-h-11 w-full items-start gap-3 py-3 text-left hover:bg-teal-soft/50"
                >
                  <span
                    aria-hidden="true"
                    className={cn("mt-1.5 h-2 w-2 shrink-0 rounded-full", KIND_META[e.kind].dot)}
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block break-words text-sm font-medium">{e.title}</span>
                    <span className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs text-muted-foreground">
                      <span>
                        {relativeDayLabel(start, now)} · {formatEventTime(e)}
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <KindIcon kind={e.kind} className="h-3 w-3" />
                        {EVENT_KIND_LABELS[e.kind]}
                      </span>
                    </span>
                    {isReminderDue(e, now) && (
                      <span className="mt-1 block">
                        <ReminderDueBadge />
                      </span>
                    )}
                  </span>
                </button>
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
}
