import {
  addDays,
  addMonths as dfAddMonths,
  addWeeks as dfAddWeeks,
  format,
  isSameDay as dfIsSameDay,
  startOfMonth,
  startOfWeek,
} from "date-fns";
import type { CareEvent } from "./types";

/**
 * Date helpers for My Care Calendar. All day keys ("YYYY-MM-DD") are built from LOCAL
 * date components. Never use `new Date("YYYY-MM-DD")`: it parses as UTC midnight and
 * shows up as the previous day west of Greenwich.
 */

export type WeekStart = 0 | 1 | 2 | 3 | 4 | 5 | 6;

const DATE_KEY_RE = /^(\d{4})-(\d{2})-(\d{2})$/;
const TIME_RE = /^([01]\d|2[0-3]):([0-5]\d)$/;

const pad = (n: number) => String(n).padStart(2, "0");

export function toDateKey(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/** "HH:MM" (24h) from local components. */
export function toTimeValue(date: Date): string {
  return `${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

/** Local-midnight Date for a key, or null when the key is malformed or not a real date. */
export function parseDateKey(key: string): Date | null {
  const m = DATE_KEY_RE.exec(key);
  if (!m) return null;
  const y = Number(m[1]);
  const mo = Number(m[2]) - 1;
  const d = Number(m[3]);
  const date = new Date(y, mo, d);
  // Reject rollovers such as 2026-02-30 -> March 2.
  if (date.getFullYear() !== y || date.getMonth() !== mo || date.getDate() !== d) return null;
  return date;
}

export function isValidDateKey(key: string): boolean {
  return parseDateKey(key) !== null;
}

export function isValidTime(value: string): boolean {
  return TIME_RE.test(value);
}

/** Combine a local day key and "HH:MM" into a local Date, or null if either is invalid. */
export function combineLocalDateTime(dateKey: string, time: string): Date | null {
  const day = parseDateKey(dateKey);
  const t = TIME_RE.exec(time);
  if (!day || !t) return null;
  return new Date(day.getFullYear(), day.getMonth(), day.getDate(), Number(t[1]), Number(t[2]));
}

export function isSameDay(a: Date, b: Date): boolean {
  return dfIsSameDay(a, b);
}

export function addMonths(date: Date, amount: number): Date {
  return dfAddMonths(date, amount);
}

export function addWeeks(date: Date, amount: number): Date {
  return dfAddWeeks(date, amount);
}

export interface CalendarDay {
  date: Date;
  key: string;
  inMonth: boolean;
}

/** Always 6 weeks x 7 days so the grid height never jumps between months. */
export function monthGrid(year: number, monthIndex: number, weekStartsOn: WeekStart = 0) {
  const first = startOfMonth(new Date(year, monthIndex, 1));
  const gridStart = startOfWeek(first, { weekStartsOn });
  const weeks: CalendarDay[][] = [];
  for (let w = 0; w < 6; w++) {
    const week: CalendarDay[] = [];
    for (let d = 0; d < 7; d++) {
      const date = addDays(gridStart, w * 7 + d);
      week.push({ date, key: toDateKey(date), inMonth: date.getMonth() === first.getMonth() });
    }
    weeks.push(week);
  }
  return weeks;
}

/** The 7 local days of the week containing `anchor`. */
export function weekDays(anchor: Date, weekStartsOn: WeekStart = 0): Date[] {
  const start = startOfWeek(anchor, { weekStartsOn });
  return Array.from({ length: 7 }, (_, i) => addDays(start, i));
}

export function weekdayLabels(weekStartsOn: WeekStart = 0) {
  // 2023-01-01 was a Sunday; build labels from local constructors.
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(2023, 0, 1 + ((i + weekStartsOn) % 7));
    return { short: format(d, "EEEEE"), medium: format(d, "EEE"), long: format(d, "EEEE") };
  });
}

const startMs = (e: Pick<CareEvent, "startsAt">) => new Date(e.startsAt).getTime();

export function sortByStart<T extends Pick<CareEvent, "startsAt">>(events: readonly T[]): T[] {
  return [...events].sort((a, b) => startMs(a) - startMs(b));
}

/** Not over yet: starts now or later, or has an end time still in the future. */
export function isUpcoming(event: Pick<CareEvent, "startsAt" | "endsAt">, now: Date): boolean {
  const n = now.getTime();
  if (startMs(event) >= n) return true;
  return event.endsAt !== null && new Date(event.endsAt).getTime() > n;
}

/** Entries that are not over yet (including later today), soonest first. */
export function upcoming<T extends Pick<CareEvent, "startsAt" | "endsAt">>(
  events: readonly T[],
  now: Date,
  limit = Number.POSITIVE_INFINITY,
): T[] {
  return sortByStart(events.filter((e) => isUpcoming(e, now))).slice(0, limit);
}

export interface DayGroup<T> {
  key: string;
  date: Date;
  events: T[];
}

/** Group by LOCAL day, days ascending and entries ascending within each day. */
export function groupByDay<T extends Pick<CareEvent, "startsAt">>(
  events: readonly T[],
): DayGroup<T>[] {
  const map = new Map<string, DayGroup<T>>();
  for (const e of sortByStart(events)) {
    const start = new Date(e.startsAt);
    const key = toDateKey(start);
    let group = map.get(key);
    if (!group) {
      const date = new Date(start.getFullYear(), start.getMonth(), start.getDate());
      group = { key, date, events: [] };
      map.set(key, group);
    }
    group.events.push(e);
  }
  return [...map.values()];
}

export function eventsOnDay<T extends Pick<CareEvent, "startsAt">>(
  events: readonly T[],
  dateKey: string,
): T[] {
  return sortByStart(events.filter((e) => toDateKey(new Date(e.startsAt)) === dateKey));
}

/** Grace period after the start of an entry without an end time. */
export const REMINDER_GRACE_MINUTES = 15;

/**
 * True from the reminder time until the entry ends (or, without an end time, until
 * REMINDER_GRACE_MINUTES after it starts). In-app only — nothing is pushed or emailed.
 */
export function isReminderDue(
  event: Pick<CareEvent, "startsAt" | "endsAt" | "reminderMinutes">,
  now: Date,
): boolean {
  if (event.reminderMinutes === null) return false;
  const start = startMs(event);
  const until = event.endsAt
    ? new Date(event.endsAt).getTime()
    : start + REMINDER_GRACE_MINUTES * 60_000;
  const n = now.getTime();
  return n >= start - event.reminderMinutes * 60_000 && n < until;
}

export function formatClock(date: Date): string {
  return format(date, "h:mm a");
}

/** "9:00 AM" or "9:00 AM – 10:30 AM" (adds the end date when it falls on another day). */
export function formatEventTime(event: Pick<CareEvent, "startsAt" | "endsAt">): string {
  const start = new Date(event.startsAt);
  if (!event.endsAt) return formatClock(start);
  const end = new Date(event.endsAt);
  const endText = isSameDay(start, end) ? formatClock(end) : format(end, "MMM d, h:mm a");
  return `${formatClock(start)} – ${endText}`;
}

/** "Mon, Oct 26" — local. */
export function formatDayShort(date: Date): string {
  return format(date, "EEE, MMM d");
}

export function formatDayLong(date: Date): string {
  return format(date, "EEEE, MMMM d, yyyy");
}

/** Friendly day label relative to `now`: "Today", "Tomorrow", or "Mon, Oct 26". */
export function relativeDayLabel(date: Date, now: Date): string {
  if (isSameDay(date, now)) return "Today";
  if (isSameDay(date, addDays(now, 1))) return "Tomorrow";
  return formatDayShort(date);
}

export type CalendarView = "month" | "week" | "agenda";

export function formatRangeTitle(view: CalendarView, anchor: Date, weekStartsOn: WeekStart = 0) {
  if (view === "month") return format(anchor, "MMMM yyyy");
  if (view === "agenda") return `From ${format(anchor, "MMM d, yyyy")}`;
  const days = weekDays(anchor, weekStartsOn);
  const first = days[0] ?? anchor;
  const last = days[6] ?? anchor;
  if (first.getFullYear() !== last.getFullYear()) {
    return `${format(first, "MMM d, yyyy")} – ${format(last, "MMM d, yyyy")}`;
  }
  if (first.getMonth() !== last.getMonth()) {
    return `${format(first, "MMM d")} – ${format(last, "MMM d, yyyy")}`;
  }
  return `${format(first, "MMM d")} – ${format(last, "d, yyyy")}`;
}

/** Move the anchor by one unit of the current view. Agenda pages by week. */
export function shiftAnchor(view: CalendarView, anchor: Date, direction: 1 | -1): Date {
  return view === "month" ? addMonths(anchor, direction) : addWeeks(anchor, direction);
}
