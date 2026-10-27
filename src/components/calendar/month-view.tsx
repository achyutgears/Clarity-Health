import { useEffect, useMemo, useRef, type KeyboardEvent } from "react";
import { addDays, endOfWeek, startOfWeek } from "date-fns";
import {
  addMonths,
  EVENT_KIND_LABELS,
  formatClock,
  formatDayLong,
  formatRangeTitle,
  groupByDay,
  isSameDay,
  monthGrid,
  toDateKey,
  weekdayLabels,
  type CareEvent,
} from "@/lib/calendar";
import { cn } from "@/lib/utils";
import { KIND_META, KindIcon } from "./kind";

const entryCount = (n: number) => (n === 0 ? "no entries" : n === 1 ? "1 entry" : `${n} entries`);

export function MonthView({
  anchor,
  today,
  selectedKey,
  events,
  onSelectDay,
}: {
  anchor: Date;
  today: Date;
  selectedKey: string | null;
  events: CareEvent[];
  onSelectDay: (date: Date) => void;
}) {
  const weeks = useMemo(() => monthGrid(anchor.getFullYear(), anchor.getMonth()), [anchor]);
  const byDay = useMemo(() => {
    const map = new Map<string, CareEvent[]>();
    for (const g of groupByDay(events)) map.set(g.key, g.events);
    return map;
  }, [events]);
  const labels = weekdayLabels();
  const gridRef = useRef<HTMLDivElement>(null);
  const pendingFocus = useRef<string | null>(null);

  const keys = weeks.flat().map((d) => d.key);
  const todayKey = toDateKey(today);
  const firstInMonth = weeks.flat().find((d) => d.inMonth)?.key ?? keys[0];
  const focusKey =
    selectedKey && keys.includes(selectedKey)
      ? selectedKey
      : keys.includes(todayKey)
        ? todayKey
        : firstInMonth;

  useEffect(() => {
    const key = pendingFocus.current;
    if (!key) return;
    pendingFocus.current = null;
    gridRef.current?.querySelector<HTMLButtonElement>(`[data-day="${key}"]`)?.focus();
  });

  const onKeyDown = (e: KeyboardEvent<HTMLButtonElement>, date: Date) => {
    let next: Date | null = null;
    if (e.key === "ArrowLeft") next = addDays(date, -1);
    else if (e.key === "ArrowRight") next = addDays(date, 1);
    else if (e.key === "ArrowUp") next = addDays(date, -7);
    else if (e.key === "ArrowDown") next = addDays(date, 7);
    else if (e.key === "Home") next = startOfWeek(date);
    else if (e.key === "End") next = endOfWeek(date);
    else if (e.key === "PageUp") next = addMonths(date, -1);
    else if (e.key === "PageDown") next = addMonths(date, 1);
    if (!next) return;
    e.preventDefault();
    pendingFocus.current = toDateKey(next);
    onSelectDay(next);
  };

  return (
    <div
      ref={gridRef}
      role="grid"
      aria-label={formatRangeTitle("month", anchor)}
      aria-describedby="month-grid-help"
      className="overflow-hidden rounded-lg border border-border bg-card"
    >
      <p id="month-grid-help" className="sr-only">
        Use arrow keys to move between days. Page Up and Page Down change the month.
      </p>
      <div role="row" className="grid grid-cols-7 border-b border-border bg-muted/50">
        {labels.map((l) => (
          <div
            key={l.long}
            role="columnheader"
            aria-label={l.long}
            className="py-2 text-center font-mono text-[10px] uppercase tracking-wider text-muted-foreground"
          >
            <span aria-hidden="true" className="sm:hidden">
              {l.short}
            </span>
            <span aria-hidden="true" className="hidden sm:inline">
              {l.medium}
            </span>
          </div>
        ))}
      </div>
      {weeks.map((week) => (
        <div
          key={week[0]?.key}
          role="row"
          className="grid grid-cols-7 border-b border-border last:border-b-0"
        >
          {week.map((day) => {
            const list = byDay.get(day.key) ?? [];
            const isToday = isSameDay(day.date, today);
            const selected = day.key === selectedKey;
            return (
              <div
                key={day.key}
                role="gridcell"
                aria-selected={selected}
                className="border-r border-border last:border-r-0"
              >
                <button
                  type="button"
                  data-day={day.key}
                  tabIndex={day.key === focusKey ? 0 : -1}
                  aria-label={`${formatDayLong(day.date)}${isToday ? ", today" : ""}, ${entryCount(list.length)}`}
                  aria-current={isToday ? "date" : undefined}
                  onClick={() => onSelectDay(day.date)}
                  onKeyDown={(e) => onKeyDown(e, day.date)}
                  className={cn(
                    "flex h-full min-h-[3.25rem] w-full flex-col items-stretch gap-1 p-1 text-left transition-colors hover:bg-teal-soft/60 focus-visible:relative focus-visible:z-10 sm:min-h-[6.5rem] sm:p-1.5",
                    !day.inMonth && "bg-muted/40 text-muted-foreground/70",
                    selected && "bg-teal-soft ring-2 ring-inset ring-primary",
                  )}
                >
                  <span
                    aria-hidden="true"
                    className={cn(
                      "inline-flex h-6 w-6 items-center justify-center self-center rounded-full font-mono text-xs tabular-nums sm:self-start",
                      isToday && "bg-primary font-semibold text-primary-foreground",
                    )}
                  >
                    {day.date.getDate()}
                  </span>

                  {list.length > 0 && (
                    <>
                      {/* Mobile: compact dots (the selected-day panel lists details with labels). */}
                      <span
                        aria-hidden="true"
                        className="flex flex-wrap justify-center gap-0.5 sm:hidden"
                      >
                        {list.slice(0, 3).map((e) => (
                          <span
                            key={e.id}
                            className={cn("h-1.5 w-1.5 rounded-full", KIND_META[e.kind].dot)}
                          />
                        ))}
                        {list.length > 3 && (
                          <span className="text-[9px] leading-none">+{list.length - 3}</span>
                        )}
                      </span>
                      {/* Larger screens: chips with icon + time + title. */}
                      <span aria-hidden="true" className="hidden min-w-0 flex-col gap-0.5 sm:flex">
                        {list.slice(0, 2).map((e) => (
                          <span
                            key={e.id}
                            title={`${EVENT_KIND_LABELS[e.kind]}: ${e.title}`}
                            className={cn(
                              "flex min-w-0 items-center gap-1 rounded border px-1 py-0.5 text-[11px] leading-tight",
                              KIND_META[e.kind].chip,
                            )}
                          >
                            <KindIcon kind={e.kind} className="h-3 w-3" />
                            <span className="truncate">
                              <span className="font-mono text-[10px] opacity-80">
                                {formatClock(new Date(e.startsAt)).replace(":00", "")}
                              </span>{" "}
                              {e.title}
                            </span>
                          </span>
                        ))}
                        {list.length > 2 && (
                          <span className="px-1 text-[11px] text-muted-foreground">
                            +{list.length - 2} more
                          </span>
                        )}
                      </span>
                    </>
                  )}
                </button>
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}
