import { BellRing, Clock, MapPin, Pencil, Trash2, Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatEventTime, isReminderDue, reminderLabel, type CareEvent } from "@/lib/calendar";
import { cn } from "@/lib/utils";
import { APPOINTMENT_NOTE, KindBadge, PersonalBadge } from "./kind";

export function ReminderDueBadge() {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-warning-soft px-2 py-0.5 text-[11px] font-medium leading-5 text-warning-foreground">
      <BellRing aria-hidden="true" className="h-3 w-3" /> Reminder due
    </span>
  );
}

export function EventCard({
  event,
  now,
  onEdit,
  onDelete,
  disabled = false,
  headingLevel = 3,
  className,
}: {
  event: CareEvent;
  now: Date;
  onEdit: (event: CareEvent) => void;
  onDelete: (event: CareEvent) => void;
  disabled?: boolean;
  headingLevel?: 3 | 4;
  className?: string;
}) {
  const Heading = headingLevel === 3 ? "h3" : "h4";
  const due = isReminderDue(event, now);
  return (
    <article className={cn("surface p-4", className)}>
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <KindBadge kind={event.kind} />
            <PersonalBadge />
            {due && <ReminderDueBadge />}
          </div>
          <Heading className="mt-2 break-words font-display text-xl leading-tight">
            {event.title}
          </Heading>
          <dl className="mt-2 space-y-1 text-sm text-muted-foreground">
            <div className="flex items-start gap-2">
              <dt className="sr-only">Time</dt>
              <Clock aria-hidden="true" className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              <dd>{formatEventTime(event)}</dd>
            </div>
            {event.location && (
              <div className="flex items-start gap-2">
                <dt className="sr-only">Location</dt>
                <MapPin aria-hidden="true" className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                <dd className="min-w-0 break-words">{event.location}</dd>
              </div>
            )}
            {event.reminderMinutes !== null && (
              <div className="flex items-start gap-2">
                <dt className="sr-only">Reminder</dt>
                <Bell aria-hidden="true" className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                <dd>Reminder: {reminderLabel(event.reminderMinutes).toLowerCase()}</dd>
              </div>
            )}
          </dl>
          {event.notes && (
            <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-relaxed">
              {event.notes}
            </p>
          )}
          {event.kind === "appointment" && (
            <p className="mt-2 text-xs text-muted-foreground">{APPOINTMENT_NOTE}</p>
          )}
        </div>
        <div className="flex shrink-0 gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-10 w-10"
            disabled={disabled}
            aria-label={`Edit ${event.title}`}
            onClick={() => onEdit(event)}
          >
            <Pencil />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-10 w-10 text-destructive hover:text-destructive"
            disabled={disabled}
            aria-label={`Delete ${event.title}`}
            onClick={() => onDelete(event)}
          >
            <Trash2 />
          </Button>
        </div>
      </div>
    </article>
  );
}
