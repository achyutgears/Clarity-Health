import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Wordmark } from "@/components/brand";
import { supabase } from "@/integrations/supabase/client";
import { credentialsSchema } from "@/lib/auth";
import { pageMeta } from "@/lib/seo";

export const Route = createFileRoute("/reset-password")({
  head: () => pageMeta("Reset password", "Choose a new password for your Clarity Health account."),
  component: Reset,
});

function Reset() {
  const navigate = useNavigate();
  const [recovery, setRecovery] = useState(false);
  const [pw, setPw] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (window.location.hash.includes("type=recovery")) setRecovery(true);
    const { data } = supabase.auth.onAuthStateChange((e) => { if (e === "PASSWORD_RECOVERY") setRecovery(true); });
    return () => data.subscription.unsubscribe();
  }, []);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const r = credentialsSchema.shape.password.safeParse(pw);
    if (!r.success) return setErr(r.error.issues[0]?.message ?? "Invalid password");
    setBusy(true);
    const { error } = await supabase.auth.updateUser({ password: pw });
    setBusy(false);
    if (error) return setErr(error.message);
    navigate({ to: "/dashboard" });
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-background px-6">
      <Wordmark className="mb-10" />
      <div className="surface w-full max-w-sm p-8">
        <h1 className="font-display text-3xl">Set a new password</h1>
        {!recovery ? (
          <p className="mt-3 text-sm text-muted-foreground">
            Open this page from the reset link in your email. <Link to="/sign-in" className="text-foreground underline">Back to sign in</Link>
          </p>
        ) : (
          <form onSubmit={submit} className="mt-5 space-y-4" noValidate>
            <div>
              <label htmlFor="new-pw" className="text-sm font-medium">New password</label>
              <input id="new-pw" type="password" autoComplete="new-password" value={pw} onChange={(e) => setPw(e.target.value)}
                aria-invalid={!!err} aria-describedby={err ? "new-pw-err" : undefined}
                className="mt-1.5 w-full rounded-md border border-input bg-card px-3 py-2.5 text-sm" />
              {err && <p id="new-pw-err" className="mt-1 text-xs text-destructive">{err}</p>}
            </div>
            <Button type="submit" className="h-11 w-full" disabled={busy}>{busy && <Loader2 className="h-4 w-4 animate-spin" />}Update password</Button>
          </form>
        )}
      </div>
    </main>
  );
}
