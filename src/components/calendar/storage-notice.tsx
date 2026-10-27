import { Cloud, LogIn } from "lucide-react";
import { Notice } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import type { StorageReason } from "@/lib/calendar";

export function StorageNotice({
  reason,
  onSignIn,
}: {
  reason: StorageReason;
  onSignIn: () => void;
}) {
  if (reason === "cloud") {
    return (
      <p className="inline-flex items-center gap-2 text-sm text-success">
        <Cloud aria-hidden="true" className="h-4 w-4" /> Synced to your account.
      </p>
    );
  }
  if (reason === "cloud-not-set-up") {
    return (
      <Notice tone="warning">
        Account sync isn&apos;t set up yet (database migration pending), so entries are saved in
        this browser only.
      </Notice>
    );
  }
  return (
    <Notice>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <span>Saved in this browser only. Sign in to keep your calendar in your account.</span>
        <Button variant="outline" className="h-10 bg-card" onClick={onSignIn}>
          <LogIn aria-hidden="true" /> Sign in
        </Button>
      </div>
    </Notice>
  );
}
