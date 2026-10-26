import { X } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogTitle, DialogClose } from "@/components/ui/dialog";
import { AuthForm } from "@/components/auth-form";
import { Wordmark } from "@/components/brand";
import { useAuth } from "@/lib/auth";

export function SignInDialog() {
  const { prompt, closePrompt } = useAuth();
  return (
    <Dialog open={!!prompt} onOpenChange={(o) => !o && closePrompt()}>
      <DialogContent className="max-w-md gap-0 overflow-hidden p-0 [&>button:last-child]:hidden">
        <div className="relative bg-ink px-6 py-5 text-ink-foreground">
          <Wordmark />
          <DialogClose aria-label="Close" className="absolute right-4 top-4 rounded p-1 text-ink-foreground/70 hover:text-ink-foreground">
            <X className="h-4 w-4" />
          </DialogClose>
        </div>
        <div className="px-6 py-6">
          <DialogTitle className="font-display text-2xl font-normal">Sign in to continue</DialogTitle>
          <DialogDescription className="mt-1 mb-5 text-sm text-muted-foreground">{prompt?.reason}</DialogDescription>
          <AuthForm idPrefix="dialog" onSuccess={() => { const a = prompt?.action; closePrompt(); a?.(); }} />
        </div>
      </DialogContent>
    </Dialog>
  );
}
