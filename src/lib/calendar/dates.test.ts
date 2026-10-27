import { describe, expect, it } from "vitest";
import {
  addMonths,
  combineLocalDateTime,
  eventsOnDay,
  formatEventTime,
  formatRangeTitle,
  groupByDay,
  isReminderDue,
  isSameDay,
  isValidDateKey,
  isValidTime,
  monthGrid,
  parseDateKey,
  relativeDayLabel,
  shiftAnchor,
  toDateKey,
  toTimeValue,
  upcoming,
  weekDays,
} from "./dates";
import type { CareEvent } from "./types";

function ev(id: string, start: Date, end: Date | null = null, extra: Partial<CareEvent> = {}) {
  return {
    id,
    title: id,
    kind: "reminder",
    startsAt: start.toISOString(),
    endsAt: end ? end.toISOString() : null,
    location: null,
    notes: null,
    reminderMinutes: null,
    createdAt: start.toISOString(),
    updatedAt: start.toISOString(),
    ...extra,
  } satisfies CareEvent;
}

describe("date keys", () => {
  it("builds keys from local components, not UTC", () => {
    // 11:30 PM local on Jan 31 must stay Jan 31 regardless of the machine's offset.
    expect(toDateKey(new Date(2026, 0, 31, 23, 30))).toBe("2026-01-31");
    expect(toDateKey(new Date(2026, 0, 1, 0, 5))).toBe("2026-01-01");
    expect(toDateKey(new Date(2026, 11, 9))).toBe("2026-12-09");
  });

  it("parses keys to local midnight (no off-by-one)", () => {
    const d = parseDateKey("2026-03-01");
    expect(d).not.toBeNull();
    expect(d?.getFullYear()).toBe(2026);
    expect(d?.getMonth()).toBe(2);
    expect(d?.getDate()).toBe(1);
    expect(d?.getHours()).toBe(0);
    expect(toDateKey(d as Date)).toBe("2026-03-01");
  });

  it("round-trips every day of a leap year", () => {
    for (let i = 0; i < 366; i++) {
      const d = new Date(2028, 0, 1 + i);
      expect(toDateKey(parseDateKey(toDateKey(d)) as Date)).toBe(toDateKey(d));
    }
  });

  it("rejects malformed and impossible dates", () => {
    expect(parseDateKey("2026-02-30")).toBeNull();
    expect(parseDateKey("2026-13-01")).toBeNull();
    expect(parseDateKey("2026-1-01")).toBeNull();
    expect(parseDateKey("")).toBeNull();
    expect(isValidDateKey("2028-02-29")).toBe(true);
    expect(isValidDateKey("2027-02-29")).toBe(false);
  });

  it("validates HH:MM times", () => {
    expect(isValidTime("00:00")).toBe(true);
    expect(isValidTime("23:59")).toBe(true);
    expect(isValidTime("24:00")).toBe(false);
    expect(isValidTime("9:00")).toBe(false);
    expect(isValidTime("12:60")).toBe(false);
  });
});

describe("combineLocalDateTime", () => {
  it("returns a local Date for the given day and time", () => {
    const d = combineLocalDateTime("2026-10-26", "08:45");
    expect(d).toEqual(new Date(2026, 9, 26, 8, 45));
    expect(toDateKey(d as Date)).toBe("2026-10-26");
    expect(toTimeValue(d as Date)).toBe("08:45");
  });

  it("keeps late-evening times on the chosen day", () => {
    const d = combineLocalDateTime("2026-12-31", "23:59") as Date;
    expect(toDateKey(d)).toBe("2026-12-31");
  });

  it("returns null for invalid input", () => {
    expect(combineLocalDateTime("2026-02-30", "10:00")).toBeNull();
    expect(combineLocalDateTime("2026-02-10", "")).toBeNull();
  });
});

describe("monthGrid", () => {
  it("is always 6 weeks of 7 days starting on the requested weekday", () => {
    const grid = monthGrid(2026, 9); // October 2026
    expect(grid).toHaveLength(6);
    for (const week of grid) expect(week).toHaveLength(7);
    expect(grid[0]?.[0]?.date.getDay()).toBe(0);
    const monday = monthGrid(2026, 9, 1);
    expect(monday[0]?.[0]?.date.getDay()).toBe(1);
  });

  it("flags in-month days and includes the 1st and last day", () => {
    const days = monthGrid(2026, 1).flat(); // February 2026 (28 days)
    const inMonth = days.filter((d) => d.inMonth);
    expect(inMonth).toHaveLength(28);
    expect(inMonth[0]?.key).toBe("2026-02-01");
    expect(inMonth.at(-1)?.key).toBe("2026-02-28");
    // Keys are unique and consecutive.
    expect(new Set(days.map((d) => d.key)).size).toBe(42);
  });

  it("handles months that start on the week start day", () => {
    // Feb 1 2026 is a Sunday.
    expect(monthGrid(2026, 1)[0]?.[0]?.key).toBe("2026-02-01");
  });
});

describe("weekDays / navigation", () => {
  it("returns the 7 days around the anchor", () => {
    const days = weekDays(new Date(2026, 9, 28)); // Wed
    expect(days.map(toDateKey)).toEqual([
      "2026-10-25",
      "2026-10-26",
      "2026-10-27",
      "2026-10-28",
      "2026-10-29",
      "2026-10-30",
      "2026-10-31",
    ]);
  });

  it("shifts by month or week and clamps month ends", () => {
    expect(toDateKey(addMonths(new Date(2026, 0, 31), 1))).toBe("2026-02-28");
    expect(toDateKey(shiftAnchor("month", new Date(2026, 9, 15), -1))).toBe("2026-09-15");
    expect(toDateKey(shiftAnchor("week", new Date(2026, 9, 26), 1))).toBe("2026-11-02");
    expect(toDateKey(shiftAnchor("agenda", new Date(2026, 9, 26), -1))).toBe("2026-10-19");
  });

  it("formats range titles", () => {
    expect(formatRangeTitle("month", new Date(2026, 9, 5))).toBe("October 2026");
    expect(formatRangeTitle("week", new Date(2026, 9, 28))).toBe("Oct 25 – 31, 2026");
    expect(formatRangeTitle("week", new Date(2026, 10, 1))).toBe("Nov 1 – 7, 2026");
    expect(formatRangeTitle("week", new Date(2026, 9, 1))).toBe("Sep 27 – Oct 3, 2026");
    expect(formatRangeTitle("week", new Date(2026, 11, 30))).toBe("Dec 27, 2026 – Jan 2, 2027");
  });

  it("compares days locally", () => {
    expect(isSameDay(new Date(2026, 9, 26, 0, 1), new Date(2026, 9, 26, 23, 59))).toBe(true);
    expect(isSameDay(new Date(2026, 9, 26, 23, 59), new Date(2026, 9, 27, 0, 0))).toBe(false);
    const now = new Date(2026, 9, 26, 12);
    expect(relativeDayLabel(new Date(2026, 9, 26, 18), now)).toBe("Today");
    expect(relativeDayLabel(new Date(2026, 9, 27, 8), now)).toBe("Tomorrow");
    expect(relativeDayLabel(new Date(2026, 9, 29), now)).toBe("Thu, Oct 29");
  });
});

describe("upcoming", () => {
  const now = new Date(2026, 9, 26, 12, 0);
  const past = ev("past", new Date(2026, 9, 25, 9));
  const earlierToday = ev("earlier-today", new Date(2026, 9, 26, 8));
  const ongoing = ev("ongoing", new Date(2026, 9, 26, 11), new Date(2026, 9, 26, 13));
  const laterToday = ev("later-today", new Date(2026, 9, 26, 17));
  const tomorrow = ev("tomorrow", new Date(2026, 9, 27, 9));
  const nextWeek = ev("next-week", new Date(2026, 10, 2, 9));

  it("includes later today and ongoing entries, excludes past ones, sorted ascending", () => {
    const list = upcoming([nextWeek, past, tomorrow, laterToday, earlierToday, ongoing], now);
    expect(list.map((e) => e.id)).toEqual(["ongoing", "later-today", "tomorrow", "next-week"]);
  });

  it("respects the limit and does not mutate input", () => {
    const input = [nextWeek, tomorrow, laterToday];
    expect(upcoming(input, now, 2).map((e) => e.id)).toEqual(["later-today", "tomorrow"]);
    expect(input.map((e) => e.id)).toEqual(["next-week", "tomorrow", "later-today"]);
  });

  it("treats an entry starting exactly now as upcoming", () => {
    expect(upcoming([ev("now", now)], now)).toHaveLength(1);
  });
});

describe("groupByDay / eventsOnDay", () => {
  it("groups by local day in ascending order", () => {
    const a = ev("a", new Date(2026, 9, 27, 9));
    const b = ev("b", new Date(2026, 9, 26, 23, 30));
    const c = ev("c", new Date(2026, 9, 26, 7));
    const groups = groupByDay([a, b, c]);
    expect(groups.map((g) => g.key)).toEqual(["2026-10-26", "2026-10-27"]);
    expect(groups[0]?.events.map((e) => e.id)).toEqual(["c", "b"]);
    expect(groups[0]?.date).toEqual(new Date(2026, 9, 26));
    expect(eventsOnDay([a, b, c], "2026-10-26").map((e) => e.id)).toEqual(["c", "b"]);
  });
});

describe("formatEventTime / isReminderDue", () => {
  it("formats start and optional end", () => {
    expect(formatEventTime(ev("x", new Date(2026, 9, 26, 9, 5)))).toBe("9:05 AM");
    expect(formatEventTime(ev("x", new Date(2026, 9, 26, 9), new Date(2026, 9, 26, 10, 30)))).toBe(
      "9:00 AM – 10:30 AM",
    );
    expect(formatEventTime(ev("x", new Date(2026, 9, 26, 22), new Date(2026, 9, 27, 1)))).toBe(
      "10:00 PM – Oct 27, 1:00 AM",
    );
  });

  it("is due from the reminder time until the entry is over", () => {
    const e = ev("r", new Date(2026, 9, 26, 15), null, { reminderMinutes: 60 });
    expect(isReminderDue(e, new Date(2026, 9, 26, 13, 59))).toBe(false);
    expect(isReminderDue(e, new Date(2026, 9, 26, 14, 0))).toBe(true);
    expect(isReminderDue(e, new Date(2026, 9, 26, 15, 10))).toBe(true);
    expect(isReminderDue(e, new Date(2026, 9, 26, 15, 30))).toBe(false);
    expect(isReminderDue({ ...e, reminderMinutes: null }, new Date(2026, 9, 26, 14, 30))).toBe(
      false,
    );
  });
});
