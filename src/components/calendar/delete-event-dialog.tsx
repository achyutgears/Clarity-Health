import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { buttonVariants } from "@/components/ui/button";
import {
  formatDayLong,
  formatEventTime,
  type CareEvent,
  type MutationResult,
} from "@/lib/calendar";
import { cn } from "@/lib/utils";

export function DeleteEventDialog({
  event,
  onClose,
  onConfirm,
}: {
  event: CareEvent | null;
  onClose: () => void;
  onConfirm: (id: string) => Promise<MutationResult>;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Keep the last entry while the close animation runs so the text doesn't blank out.
  const [shown, setShown] = useState<CareEvent | null>(event);
  useEffect(() => {
    setError(null);
    setBusy(false);
    if (event) setShown(event);
  }, [event]);

  const confirm = async () => {
    if (!event || busy) return;
    setBusy(true);
    setError(null);
    const res = await onConfirm(event.id);
    setBusy(false);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    toast.success("Entry deleted");
    onClose();
  };

  return (
    <AlertDialog open={event !== null} onOpenChange={(o) => !o && !busy && onClose()}>
      <AlertDialogContent className="w-[calc(100%-2rem)] rounded-lg">
        <AlertDialogHeader>
          <AlertDialogTitle className="font-display text-2xl font-normal">
            Delete this entry?
          </AlertDialogTitle>
          <AlertDialogDescription>
            {shown
              ? `“${shown.title}” on ${formatDayLong(new Date(shown.startsAt))} at ${formatEventTime(shown)} will be removed. This can't be undone.`
              : ""}
          </AlertDialogDescription>
        </AlertDialogHeader>
        {error && (
          <p
            role="alert"
            className="rounded-md bg-warning-soft px-3 py-2 text-sm text-warning-foreground"
          >
            {error}
          </p>
        )}
        <AlertDialogFooter className="gap-2">
          <AlertDialogCancel className="h-11" disabled={busy}>
            Keep entry
          </AlertDialogCancel>
          <AlertDialogAction
            className={cn(buttonVariants({ variant: "destructive" }), "h-11")}
            disabled={busy}
            onClick={(e) => {
              // Stay open until the delete really succeeds.
              e.preventDefault();
              void confirm();
            }}
          >
            {busy && <Loader2 className="animate-spin" aria-hidden="true" />}
            {busy ? "Deleting…" : "Delete entry"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
