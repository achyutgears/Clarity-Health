import { useMemo } from "react";
import { format } from "date-fns";
import { Plus } from "lucide-react";
import {
  EVENT_KIND_LABELS,
  formatDayLong,
  formatEventTime,
  groupByDay,
  isSameDay,
  toDateKey,
  weekDays,
  type CareEvent,
} from "@/lib/calendar";
import { cn } from "@/lib/utils";
import { KIND_META, KindIcon } from "./kind";

export function WeekView({
  anchor,
  today,
  selectedKey,
  events,
  disabled,
  onSelectDay,
  onOpenEvent,
  onAdd,
}: {
  anchor: Date;
  today: Date;
  selectedKey: string | null;
  events: CareEvent[];
  disabled: boolean;
  onSelectDay: (date: Date) => void;
  onOpenEvent: (event: CareEvent) => void;
  onAdd: (dateKey: string) => void;
}) {
  const days = weekDays(anchor);
  const byDay = useMemo(() => {
    const map = new Map<string, CareEvent[]>();
    for (const g of groupByDay(events)) map.set(g.key, g.events);
    return map;
  }, [events]);

  return (
    <ol
      className="grid gap-2 md:grid-cols-7 xl:grid-cols-1 2xl:grid-cols-7"
      aria-label="Days this week"
    >
      {days.map((day) => {
        const key = toDateKey(day);
        const list = byDay.get(key) ?? [];
        const isToday = isSameDay(day, today);
        const selected = key === selectedKey;
        return (
          <li
            key={key}
            className={cn(
              "flex min-w-0 flex-col rounded-lg border border-border bg-card",
              selected && "ring-2 ring-primary",
            )}
          >
            <button
              type="button"
              onClick={() => onSelectDay(day)}
              aria-pressed={selected}
              aria-label={`${formatDayLong(day)}${isToday ? ", today" : ""}, ${list.length === 1 ? "1 entry" : `${list.length} entries`}`}
              className="flex min-h-11 items-center gap-2 rounded-t-lg border-b border-border px-3 py-2 text-left hover:bg-teal-soft/60 md:flex-col md:items-start md:gap-0 xl:flex-row xl:items-center xl:gap-2 2xl:flex-col 2xl:items-start 2xl:gap-0"
            >
              <span aria-hidden="true" className="eyebrow">
                {format(day, "EEE")}
              </span>
              <span
                aria-hidden="true"
                className={cn(
                  "font-display text-2xl leading-none",
                  isToday &&
                    "inline-flex h-8 w-8 items-center justify-center rounded-full bg-primary text-lg text-primary-foreground",
                )}
              >
                {day.getDate()}
              </span>
              {isToday && (
                <span
                  aria-hidden="true"
                  className="text-xs text-accent-foreground md:mt-1 xl:mt-0 2xl:mt-1"
                >
                  Today
                </span>
              )}
            </button>
            <div className="flex flex-1 flex-col gap-1.5 p-2">
              {list.length === 0 ? (
                <p className="px-1 py-1 text-xs text-muted-foreground">No entries</p>
              ) : (
                <ul className="space-y-1.5">
                  {list.map((e) => (
                    <li key={e.id}>
                      <button
                        type="button"
                        onClick={() => onOpenEvent(e)}
                        disabled={disabled}
                        aria-label={`Edit ${e.title}, ${EVENT_KIND_LABELS[e.kind]}, ${formatEventTime(e)}`}
                        className={cn(
                          "block min-h-10 w-full rounded border px-2 py-1.5 text-left text-xs leading-snug transition-colors hover:brightness-95 disabled:opacity-60",
                          KIND_META[e.kind].chip,
                        )}
                      >
                        <span className="flex items-center gap-1 font-mono text-[10px] opacity-80">
                          <KindIcon kind={e.kind} className="h-3 w-3" />
                          {formatEventTime(e)}
                        </span>
                        <span className="mt-0.5 block break-words font-medium">{e.title}</span>
                        <span className="sr-only">{EVENT_KIND_LABELS[e.kind]}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              <button
                type="button"
                onClick={() => onAdd(key)}
                disabled={disabled}
                aria-label={`Add entry on ${formatDayLong(day)}`}
                className="mt-auto inline-flex min-h-10 items-center justify-center gap-1 rounded-md text-xs text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-50"
              >
                <Plus aria-hidden="true" className="h-3.5 w-3.5" /> Add
              </button>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
