/**
 * My Care Calendar — personal entries a patient creates for themselves.
 * Nothing here represents a booking with a clinic or provider.
 */

export const EVENT_KINDS = [
  "appointment",
  "health_task",
  "medication",
  "reminder",
  "other",
] as const;
export type EventKind = (typeof EVENT_KINDS)[number];

export const EVENT_KIND_LABELS: Record<EventKind, string> = {
  appointment: "Appointment I'm tracking",
  health_task: "Health task",
  medication: "Medication reminder",
  reminder: "Reminder",
  other: "Other",
};

/** Minutes before the start time. `null` means no reminder. */
export const REMINDER_MINUTES = [0, 15, 60, 1440] as const;
export type ReminderMinutes = (typeof REMINDER_MINUTES)[number];

export const REMINDER_LABELS: Record<ReminderMinutes, string> = {
  0: "At start time",
  15: "15 minutes before",
  60: "1 hour before",
  1440: "1 day before",
};
export const NO_REMINDER_LABEL = "No reminder";

export const TITLE_MAX = 200;
export const LOCATION_MAX = 300;
export const NOTES_MAX = 2000;

export interface CareEvent {
  id: string;
  title: string;
  kind: EventKind;
  /** ISO 8601 instant. */
  startsAt: string;
  /** ISO 8601 instant, strictly after startsAt, or null. */
  endsAt: string | null;
  location: string | null;
  notes: string | null;
  reminderMinutes: ReminderMinutes | null;
  createdAt: string;
  updatedAt: string;
}

/** What a create/update sends. Ownership is never part of the input. */
export interface CareEventInput {
  title: string;
  kind: EventKind;
  startsAt: string;
  endsAt: string | null;
  location: string | null;
  notes: string | null;
  reminderMinutes: ReminderMinutes | null;
}

export type CalendarStorage = "cloud" | "browser";
export type StorageReason = "cloud" | "signed-out" | "cloud-not-set-up";

export type MutationResult = { ok: true } | { ok: false; error: string };

export function isEventKind(value: unknown): value is EventKind {
  return typeof value === "string" && (EVENT_KINDS as readonly string[]).includes(value);
}

export function isReminderMinutes(value: unknown): value is ReminderMinutes {
  return typeof value === "number" && (REMINDER_MINUTES as readonly number[]).includes(value);
}

export function reminderLabel(minutes: ReminderMinutes | null): string {
  return minutes === null ? NO_REMINDER_LABEL : REMINDER_LABELS[minutes];
}
