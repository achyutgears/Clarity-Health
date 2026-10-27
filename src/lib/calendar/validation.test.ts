import { describe, expect, it } from "vitest";
import {
  emptyFormValues,
  eventToFormValues,
  validateEventForm,
  type EventFormValues,
} from "./validation";
import type { CareEvent } from "./types";

const base = (over: Partial<EventFormValues> = {}): EventFormValues => ({
  ...emptyFormValues("2026-10-26"),
  title: "Follow-up visit",
  ...over,
});

describe("validateEventForm", () => {
  it("accepts a minimal entry and converts local times to ISO instants", () => {
    const r = validateEventForm(base({ startTime: "09:30" }));
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(new Date(r.input.startsAt)).toEqual(new Date(2026, 9, 26, 9, 30));
    expect(r.input).toMatchObject({
      title: "Follow-up visit",
      kind: "appointment",
      endsAt: null,
      location: null,
      notes: null,
      reminderMinutes: null,
    });
  });

  it("trims text and keeps optional fields", () => {
    const r = validateEventForm(
      base({
        title: "  Pick up refill  ",
        kind: "medication",
        endTime: "10:00",
        location: "  Main St Pharmacy ",
        notes: " bring card ",
        reminder: "60",
      }),
    );
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.input.title).toBe("Pick up refill");
    expect(r.input.location).toBe("Main St Pharmacy");
    expect(r.input.notes).toBe("bring card");
    expect(r.input.reminderMinutes).toBe(60);
    expect(new Date(r.input.endsAt as string)).toEqual(new Date(2026, 9, 26, 10, 0));
  });

  it("requires a title", () => {
    const r = validateEventForm(base({ title: "   " }));
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.errors.title).toBe("Give this entry a title.");
  });

  it("limits lengths", () => {
    const r = validateEventForm(
      base({ title: "x".repeat(201), location: "y".repeat(301), notes: "z".repeat(2001) }),
    );
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.errors.title).toMatch(/200/);
    expect(r.errors.location).toMatch(/300/);
    expect(r.errors.notes).toMatch(/2000/);
    expect(validateEventForm(base({ title: "x".repeat(200) })).ok).toBe(true);
  });

  it("rejects invalid dates, times and reminder values", () => {
    const r = validateEventForm(base({ date: "2026-02-30", startTime: "", reminder: "30" }));
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.errors.date).toBeDefined();
    expect(r.errors.startTime).toBeDefined();
    expect(r.errors.reminder).toBeDefined();
  });

  it("requires the end time to be after the start time", () => {
    for (const endTime of ["09:00", "08:59"]) {
      const r = validateEventForm(base({ startTime: "09:00", endTime }));
      expect(r.ok).toBe(false);
      if (r.ok) return;
      expect(r.errors.endTime).toBe("End time must be after the start time.");
    }
    expect(validateEventForm(base({ startTime: "09:00", endTime: "09:01" })).ok).toBe(true);
  });

  it("rejects unknown kinds", () => {
    const r = validateEventForm({ ...base(), kind: "booking" as never });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.errors.kind).toBeDefined();
  });
});

describe("eventToFormValues", () => {
  it("round-trips through validation", () => {
    const event: CareEvent = {
      id: "1",
      title: "Lab work",
      kind: "health_task",
      startsAt: new Date(2026, 10, 3, 7, 15).toISOString(),
      endsAt: new Date(2026, 10, 3, 8, 0).toISOString(),
      location: "Clinic lab",
      notes: null,
      reminderMinutes: 1440,
      createdAt: "2026-10-01T00:00:00.000Z",
      updatedAt: "2026-10-01T00:00:00.000Z",
    };
    const values = eventToFormValues(event);
    expect(values).toMatchObject({
      date: "2026-11-03",
      startTime: "07:15",
      endTime: "08:00",
      reminder: "1440",
      notes: "",
    });
    const r = validateEventForm(values);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.input.startsAt).toBe(event.startsAt);
    expect(r.input.endsAt).toBe(event.endsAt);
  });
});
