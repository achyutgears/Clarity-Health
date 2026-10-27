import { useEffect, useId, useRef, useState, type FormEvent } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  EVENT_KINDS,
  EVENT_KIND_LABELS,
  NO_REMINDER_LABEL,
  REMINDER_LABELS,
  REMINDER_MINUTES,
  emptyFormValues,
  eventToFormValues,
  validateEventForm,
  type CareEvent,
  type CareEventInput,
  type EventFormErrors,
  type EventFormField,
  type EventFormValues,
  type EventKind,
  type MutationResult,
} from "@/lib/calendar";
import { cn } from "@/lib/utils";
import { APPOINTMENT_NOTE, MEDICATION_NOTE, REMINDER_HONESTY } from "./kind";

export type EventFormMode =
  { type: "create"; dateKey: string } | { type: "edit"; event: CareEvent };

const FIELD_ORDER: EventFormField[] = [
  "title",
  "kind",
  "date",
  "startTime",
  "endTime",
  "location",
  "notes",
  "reminder",
];

const field =
  "mt-1.5 block h-11 w-full rounded-md border border-input bg-card px-3 text-base transition-colors focus:border-primary aria-[invalid=true]:border-destructive sm:text-sm";

export function EventFormDialog({
  mode,
  onClose,
  onSubmit,
  storageLabel,
}: {
  mode: EventFormMode | null;
  onClose: () => void;
  onSubmit: (input: CareEventInput) => Promise<MutationResult>;
  /** e.g. "your account" or "this browser" — shown so people know where it's saved. */
  storageLabel: string;
}) {
  const uid = useId();
  const id = (f: string) => `${uid}-${f}`;
  const open = mode !== null;
  const [lastMode, setLastMode] = useState<EventFormMode | null>(mode);
  const [values, setValues] = useState<EventFormValues>(() => emptyFormValues(""));
  const [errors, setErrors] = useState<EventFormErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const savingRef = useRef(false);
  const formRef = useRef<HTMLFormElement>(null);

  // Reset the form every time the dialog opens for a new target.
  const modeKey = mode
    ? mode.type === "edit"
      ? `edit:${mode.event.id}`
      : `new:${mode.dateKey}`
    : "";
  useEffect(() => {
    if (!mode) return;
    setLastMode(mode);
    setValues(mode.type === "edit" ? eventToFormValues(mode.event) : emptyFormValues(mode.dateKey));
    setErrors({});
    setFormError(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [modeKey]);

  const set = <K extends EventFormField>(key: K, value: EventFormValues[K]) => {
    setValues((v) => ({ ...v, [key]: value }));
    if (errors[key]) setErrors((e) => ({ ...e, [key]: undefined }));
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (savingRef.current) return;
    setFormError(null);
    const result = validateEventForm(values);
    if (!result.ok) {
      setErrors(result.errors);
      const first = FIELD_ORDER.find((f) => result.errors[f]);
      if (first) document.getElementById(id(first))?.focus();
      return;
    }
    setErrors({});
    savingRef.current = true;
    setSaving(true);
    const res = await onSubmit(result.input);
    savingRef.current = false;
    setSaving(false);
    if (!res.ok) {
      setFormError(res.error);
      return;
    }
    toast.success(mode?.type === "edit" ? "Entry updated" : "Entry added", {
      description: `Saved in ${storageLabel}.`,
    });
    onClose();
  };

  const err = (f: EventFormField) =>
    errors[f] ? (
      <p id={`${id(f)}-err`} className="mt-1 text-xs text-destructive">
        {errors[f]}
      </p>
    ) : null;
  const a11y = (f: EventFormField, hint?: string) => {
    const describedBy = [errors[f] ? `${id(f)}-err` : null, hint ?? null].filter(Boolean).join(" ");
    return {
      id: id(f),
      "aria-invalid": !!errors[f],
      ...(describedBy ? { "aria-describedby": describedBy } : {}),
    };
  };

  // Keep the last target while the close animation runs so the title doesn't flip.
  const isEdit = (mode ?? lastMode)?.type === "edit";
  const kindHint =
    values.kind === "appointment"
      ? APPOINTMENT_NOTE
      : values.kind === "medication"
        ? MEDICATION_NOTE
        : null;

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next && !savingRef.current) onClose();
      }}
    >
      <DialogContent className="max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] overflow-y-auto rounded-lg sm:max-w-xl">
        <DialogHeader>
          <DialogTitle className="font-display text-3xl font-normal">
            {isEdit ? "Edit entry" : "Add a calendar entry"}
          </DialogTitle>
          <DialogDescription>
            A personal entry you&apos;re tracking. Saved in {storageLabel}.
          </DialogDescription>
        </DialogHeader>

        <form ref={formRef} onSubmit={submit} noValidate className="space-y-4" aria-busy={saving}>
          <div>
            <label htmlFor={id("title")} className="text-sm font-medium">
              Title
            </label>
            <input
              {...a11y("title")}
              value={values.title}
              onChange={(e) => set("title", e.target.value)}
              autoComplete="off"
              placeholder="e.g. Follow-up visit, refill pickup"
              className={field}
            />
            {err("title")}
          </div>

          <div>
            <label htmlFor={id("kind")} className="text-sm font-medium">
              Type
            </label>
            <select
              {...a11y("kind", kindHint ? `${id("kind")}-hint` : undefined)}
              value={values.kind}
              onChange={(e) => set("kind", e.target.value as EventKind)}
              className={field}
            >
              {EVENT_KINDS.map((k) => (
                <option key={k} value={k}>
                  {EVENT_KIND_LABELS[k]}
                </option>
              ))}
            </select>
            {kindHint && (
              <p id={`${id("kind")}-hint`} className="mt-1 text-xs text-muted-foreground">
                {kindHint}
              </p>
            )}
            {err("kind")}
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <label htmlFor={id("date")} className="text-sm font-medium">
                Date
              </label>
              <input
                {...a11y("date")}
                type="date"
                value={values.date}
                onChange={(e) => set("date", e.target.value)}
                className={field}
              />
              {err("date")}
            </div>
            <div>
              <label htmlFor={id("startTime")} className="text-sm font-medium">
                Start time
              </label>
              <input
                {...a11y("startTime")}
                type="time"
                value={values.startTime}
                onChange={(e) => set("startTime", e.target.value)}
                className={field}
              />
              {err("startTime")}
            </div>
            <div>
              <label htmlFor={id("endTime")} className="text-sm font-medium">
                End time <span className="font-normal text-muted-foreground">(optional)</span>
              </label>
              <input
                {...a11y("endTime")}
                type="time"
                value={values.endTime}
                onChange={(e) => set("endTime", e.target.value)}
                className={field}
              />
              {err("endTime")}
            </div>
          </div>

          <div>
            <label htmlFor={id("location")} className="text-sm font-medium">
              Location <span className="font-normal text-muted-foreground">(optional)</span>
            </label>
            <input
              {...a11y("location")}
              value={values.location}
              onChange={(e) => set("location", e.target.value)}
              autoComplete="off"
              className={field}
            />
            {err("location")}
          </div>

          <div>
            <label htmlFor={id("notes")} className="text-sm font-medium">
              Notes <span className="font-normal text-muted-foreground">(optional)</span>
            </label>
            <textarea
              {...a11y("notes")}
              value={values.notes}
              onChange={(e) => set("notes", e.target.value)}
              rows={3}
              className={cn(field, "h-auto min-h-[5.5rem] py-2.5")}
            />
            {err("notes")}
          </div>

          <div>
            <label htmlFor={id("reminder")} className="text-sm font-medium">
              Reminder
            </label>
            <select
              {...a11y("reminder", `${id("reminder")}-hint`)}
              value={values.reminder}
              onChange={(e) => set("reminder", e.target.value)}
              className={field}
            >
              <option value="none">{NO_REMINDER_LABEL}</option>
              {REMINDER_MINUTES.map((m) => (
                <option key={m} value={String(m)}>
                  {REMINDER_LABELS[m]}
                </option>
              ))}
            </select>
            <p id={`${id("reminder")}-hint`} className="mt-1 text-xs text-muted-foreground">
              {REMINDER_HONESTY}
            </p>
            {err("reminder")}
          </div>

          {formError && (
            <p
              role="alert"
              className="rounded-md bg-warning-soft px-3 py-2 text-sm text-warning-foreground"
            >
              {formError}
            </p>
          )}

          <DialogFooter className="gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              className="h-11"
              disabled={saving}
              onClick={onClose}
            >
              Cancel
            </Button>
            <Button type="submit" className="h-11" disabled={saving}>
              {saving && <Loader2 className="animate-spin" aria-hidden="true" />}
              {saving ? "Saving…" : isEdit ? "Save changes" : "Add entry"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
