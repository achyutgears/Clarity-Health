import { EVENT_KIND_LABELS, type EventKind } from "@/lib/calendar";
import { cn } from "@/lib/utils";
import { KIND_META } from "./kind-meta";

export { KIND_META, APPOINTMENT_NOTE, MEDICATION_NOTE, REMINDER_HONESTY } from "./kind-meta";

export function KindIcon({ kind, className }: { kind: EventKind; className?: string }) {
  const Icon = KIND_META[kind].icon;
  return <Icon aria-hidden="true" className={cn("h-3.5 w-3.5 shrink-0", className)} />;
}

export function KindBadge({ kind, className }: { kind: EventKind; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium leading-5",
        KIND_META[kind].chip,
        className,
      )}
    >
      <KindIcon kind={kind} className="h-3 w-3" />
      {EVENT_KIND_LABELS[kind]}
    </span>
  );
}

export function PersonalBadge() {
  return (
    <span className="inline-flex items-center rounded-full border border-border px-2 py-0.5 font-mono text-[10px] uppercase leading-5 tracking-wider text-muted-foreground">
      Personal entry
    </span>
  );
}
