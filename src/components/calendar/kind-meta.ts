import { Bell, CircleDot, ListChecks, Pill, Stethoscope, type LucideIcon } from "lucide-react";
import type { EventKind, StorageReason } from "@/lib/calendar";

/** Each kind has an icon shape and a text label, so color is never the only signal. */
export const KIND_META: Record<EventKind, { icon: LucideIcon; dot: string; chip: string }> = {
  appointment: {
    icon: Stethoscope,
    dot: "bg-primary",
    chip: "border-primary/30 bg-teal-soft text-accent-foreground",
  },
  health_task: {
    icon: ListChecks,
    dot: "bg-success",
    chip: "border-success/30 bg-success/10 text-foreground",
  },
  medication: {
    icon: Pill,
    dot: "bg-warning",
    chip: "border-warning/40 bg-warning-soft text-warning-foreground",
  },
  reminder: {
    icon: Bell,
    dot: "bg-ink",
    chip: "border-border bg-muted text-foreground",
  },
  other: {
    icon: CircleDot,
    dot: "bg-muted-foreground",
    chip: "border-border bg-card text-muted-foreground",
  },
};

export const APPOINTMENT_NOTE = "Personal note — not a booking with a clinic.";
export const MEDICATION_NOTE =
  "Use the schedule your clinician gave you. Clarity Health doesn't give dosing advice.";
export const REMINDER_HONESTY =
  "Reminders appear in your upcoming list and dashboard. Clarity Health does not send push or email notifications yet.";

export function storageLabelFor(reason: StorageReason): string {
  return reason === "cloud" ? "your account" : "this browser only";
}
