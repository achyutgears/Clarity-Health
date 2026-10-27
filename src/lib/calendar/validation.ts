import { z } from "zod";
import { combineLocalDateTime, isValidDateKey, isValidTime, toDateKey, toTimeValue } from "./dates";
import {
  EVENT_KINDS,
  LOCATION_MAX,
  NOTES_MAX,
  REMINDER_MINUTES,
  TITLE_MAX,
  type CareEvent,
  type CareEventInput,
  type EventKind,
  type ReminderMinutes,
} from "./types";

/** Raw values as the form holds them (all strings, so inputs stay controlled). */
export interface EventFormValues {
  title: string;
  kind: EventKind;
  date: string;
  startTime: string;
  endTime: string;
  location: string;
  notes: string;
  /** "none" or one of REMINDER_MINUTES as a string. */
  reminder: string;
}

export type EventFormField = keyof EventFormValues;
export type EventFormErrors = Partial<Record<EventFormField, string>>;

export const REMINDER_VALUES = ["none", ...REMINDER_MINUTES.map(String)] as const;

export const eventFormSchema = z
  .object({
    title: z
      .string()
      .trim()
      .min(1, "Give this entry a title.")
      .max(TITLE_MAX, `Keep the title under ${TITLE_MAX} characters.`),
    kind: z.enum(EVENT_KINDS, { message: "Choose a type." }),
    date: z.string().refine(isValidDateKey, "Choose a valid date."),
    startTime: z.string().refine(isValidTime, "Choose a start time."),
    endTime: z
      .string()
      .refine((v) => v === "" || isValidTime(v), "Enter a valid end time or leave it empty."),
    location: z
      .string()
      .trim()
      .max(LOCATION_MAX, `Keep the location under ${LOCATION_MAX} characters.`),
    notes: z.string().trim().max(NOTES_MAX, `Keep notes under ${NOTES_MAX} characters.`),
    reminder: z.string().refine((v) => (REMINDER_VALUES as readonly string[]).includes(v), {
      message: "Choose a reminder option.",
    }),
  })
  .superRefine((v, ctx) => {
    if (v.endTime === "" || !isValidTime(v.endTime) || !isValidTime(v.startTime)) return;
    if (v.endTime <= v.startTime) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["endTime"],
        message: "End time must be after the start time.",
      });
    }
  });

export type ValidationResult =
  { ok: true; input: CareEventInput } | { ok: false; errors: EventFormErrors };

/** Validate raw form values and convert local date/time fields into ISO instants. */
export function validateEventForm(values: EventFormValues): ValidationResult {
  const parsed = eventFormSchema.safeParse(values);
  if (!parsed.success) {
    const errors: EventFormErrors = {};
    for (const issue of parsed.error.issues) {
      const field = issue.path[0];
      if (typeof field === "string" && !(field in errors)) {
        errors[field as EventFormField] = issue.message;
      }
    }
    return { ok: false, errors };
  }
  const v = parsed.data;
  const start = combineLocalDateTime(v.date, v.startTime);
  if (!start) return { ok: false, errors: { startTime: "Choose a start time." } };
  const end = v.endTime ? combineLocalDateTime(v.date, v.endTime) : null;
  const reminderMinutes = v.reminder === "none" ? null : (Number(v.reminder) as ReminderMinutes);
  return {
    ok: true,
    input: {
      title: v.title,
      kind: v.kind,
      startsAt: start.toISOString(),
      endsAt: end ? end.toISOString() : null,
      location: v.location || null,
      notes: v.notes || null,
      reminderMinutes,
    },
  };
}

export function emptyFormValues(dateKey: string, startTime = "09:00"): EventFormValues {
  return {
    title: "",
    kind: "appointment",
    date: dateKey,
    startTime,
    endTime: "",
    location: "",
    notes: "",
    reminder: "none",
  };
}

export function eventToFormValues(event: CareEvent): EventFormValues {
  const start = new Date(event.startsAt);
  const end = event.endsAt ? new Date(event.endsAt) : null;
  return {
    title: event.title,
    kind: event.kind,
    date: toDateKey(start),
    startTime: toTimeValue(start),
    // Multi-day entries can't be edited as a same-day end time; keep them open-ended in the form.
    endTime: end && toDateKey(end) === toDateKey(start) ? toTimeValue(end) : "",
    location: event.location ?? "",
    notes: event.notes ?? "",
    reminder: event.reminderMinutes === null ? "none" : String(event.reminderMinutes),
  };
}

/** Schema for a stored entry (browser storage) — anything that fails is ignored. */
export const storedEventSchema = z
  .object({
    id: z.string().min(1),
    title: z.string().trim().min(1).max(TITLE_MAX),
    kind: z.enum(EVENT_KINDS),
    startsAt: z.string().refine((s) => !Number.isNaN(Date.parse(s))),
    endsAt: z
      .string()
      .refine((s) => !Number.isNaN(Date.parse(s)))
      .nullable(),
    location: z.string().max(LOCATION_MAX).nullable(),
    notes: z.string().max(NOTES_MAX).nullable(),
    reminderMinutes: z
      .number()
      .refine((n) => (REMINDER_MINUTES as readonly number[]).includes(n))
      .nullable(),
    createdAt: z.string(),
    updatedAt: z.string(),
  })
  .refine((e) => e.endsAt === null || Date.parse(e.endsAt) > Date.parse(e.startsAt));
