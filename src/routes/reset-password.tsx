import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AuthBackdrop, AuthBrandPanel } from "@/components/auth-backdrop";
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
    const { data } = supabase.auth.onAuthStateChange((e) => {
      if (e === "PASSWORD_RECOVERY") setRecovery(true);
    });
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
    <div className="grid min-h-dvh bg-background lg:min-h-screen lg:grid-cols-[1.1fr_1fr]">
      <main className="ch-auth-paper relative isolate flex min-h-dvh flex-col overflow-hidden px-4 py-6 sm:px-8 lg:order-2 lg:px-12 lg:py-10">
        <AuthBackdrop variant="paper" className="bottom-auto h-[30rem] lg:hidden" />
        <div className="relative z-10 lg:hidden">
          <Link
            to="/dashboard"
            aria-label="Clarity Health home"
            className="inline-flex min-h-10 items-center rounded-md text-foreground"
          >
            <Wordmark />
          </Link>
        </div>

        <div className="relative z-10 mx-auto my-auto w-full max-w-[26rem] py-8 lg:py-12">
          <div className="ch-auth-card animate-rise p-6 sm:p-8">
            <p className="eyebrow">Account recovery</p>
            <h1 className="mt-3 font-display text-4xl leading-none tracking-tight sm:text-5xl">
              Set a new password
            </h1>
            {!recovery ? (
              <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
                Open this page from the reset link in your email.{" "}
                <Link
                  to="/sign-in"
                  className="font-medium text-foreground underline underline-offset-4"
                >
                  Back to sign in
                </Link>
              </p>
            ) : (
              <form onSubmit={submit} className="mt-6 space-y-4" noValidate aria-busy={busy}>
                <div>
                  <label htmlFor="new-pw" className="text-sm font-medium">
                    New password
                  </label>
                  <input
                    id="new-pw"
                    type="password"
                    autoComplete="new-password"
                    value={pw}
                    onChange={(e) => setPw(e.target.value)}
                    aria-invalid={!!err}
                    aria-describedby={err ? "new-pw-err" : "new-pw-hint"}
                    className="mt-1.5 h-11 w-full rounded-lg border border-input bg-card px-3 text-sm transition-colors focus:border-primary aria-[invalid=true]:border-destructive"
                  />
                  {err ? (
                    <p id="new-pw-err" className="mt-1 text-xs text-destructive">
                      {err}
                    </p>
                  ) : (
                    <p id="new-pw-hint" className="mt-1 text-xs text-muted-foreground">
                      At least 8 characters.
                    </p>
                  )}
                </div>
                <Button type="submit" className="h-11 w-full rounded-lg" disabled={busy}>
                  {busy && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
                  Update password
                </Button>
              </form>
            )}
          </div>
        </div>

        <p className="relative z-10 text-center text-xs text-muted-foreground">
          <Link
            to="/privacy"
            className="inline-flex min-h-10 items-center rounded-sm underline-offset-4 hover:text-foreground hover:underline"
          >
            How we handle data
          </Link>
        </p>
      </main>

      {/* Form comes first in reading order; the brand panel sits to its left on desktop. */}
      <AuthBrandPanel className="lg:order-1 lg:min-h-screen" />
    </div>
  );
}
