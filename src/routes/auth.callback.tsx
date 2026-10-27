import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AlertCircle, Loader2 } from "lucide-react";
import { AuthBackdrop } from "@/components/auth-backdrop";
import { Wordmark } from "@/components/brand";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { hasAuthPayload, parseAuthCallbackError, safeNextPath } from "@/lib/auth-redirect";
import { pageMeta } from "@/lib/seo";

export const Route = createFileRoute("/auth/callback")({
  head: () => pageMeta("Finishing sign-in", "Completing sign-in to Clarity Health."),
  component: AuthCallback,
});

const SESSION_TIMEOUT_MS = 10_000;
const TIMEOUT_MESSAGE =
  "We couldn't confirm your sign-in in time. Check your connection and try again.";
const NO_SIGN_IN_MESSAGE = "There's no sign-in to finish here. Start again from the sign-in page.";

type State =
  { status: "working" } | { status: "error"; message: string; cancelled: boolean; next: string };

function AuthCallback() {
  const navigate = useNavigate();
  const [state, setState] = useState<State>({ status: "working" });

  useEffect(() => {
    // Capture the URL before Supabase's detectSessionInUrl clears the token hash.
    const { search, hash } = window.location;
    const next = safeNextPath(new URLSearchParams(search).get("next"));

    const urlError = parseAuthCallbackError(search, hash);
    if (urlError) {
      setState({ status: "error", ...urlError, next });
      return;
    }
    const expectingSession = hasAuthPayload(search, hash);

    let settled = false;
    const fail = (message: string) => {
      if (settled) return;
      settled = true;
      setState({ status: "error", message, cancelled: false, next });
    };
    const succeed = () => {
      if (settled) return;
      settled = true;
      navigate({ href: next, replace: true });
    };

    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (session && (event === "SIGNED_IN" || event === "INITIAL_SESSION")) succeed();
    });
    supabase.auth
      .getSession()
      .then(({ data }) => {
        if (data.session) succeed();
        else if (!expectingSession) fail(NO_SIGN_IN_MESSAGE);
      })
      .catch(() => {
        // Keep waiting for an auth event; the timeout below reports a real failure.
      });
    const timer = window.setTimeout(() => fail(TIMEOUT_MESSAGE), SESSION_TIMEOUT_MS);

    return () => {
      settled = true;
      window.clearTimeout(timer);
      sub.subscription.unsubscribe();
    };
  }, [navigate]);

  return (
    <main className="ch-auth-paper relative isolate flex min-h-dvh flex-col items-center justify-center overflow-hidden px-4 py-10">
      <AuthBackdrop variant="paper" />
      <div className="relative z-10 w-full max-w-[26rem]">
        <div className="mb-8 flex justify-center text-foreground">
          <Wordmark />
        </div>
        <div className="ch-auth-card animate-rise p-6 text-center sm:p-8">
          {state.status === "working" ? (
            <div role="status" aria-live="polite" className="flex flex-col items-center">
              <span className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-teal-soft text-accent-foreground">
                <Loader2 className="h-5 w-5 animate-spin" aria-hidden />
              </span>
              <h1 className="mt-5 font-display text-3xl leading-tight">Finishing sign-in…</h1>
              <p className="mt-2 text-sm text-muted-foreground">
                Confirming your account securely. This only takes a moment.
              </p>
            </div>
          ) : (
            <div role="alert" className="flex flex-col items-center">
              <span className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-warning-soft text-warning-foreground">
                <AlertCircle className="h-5 w-5" aria-hidden />
              </span>
              <h1 className="mt-5 font-display text-3xl leading-tight">
                {state.cancelled ? "Sign-in cancelled" : "Sign-in didn't finish"}
              </h1>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{state.message}</p>
              <div className="mt-6 flex w-full flex-col gap-2">
                <Button asChild className="h-11 w-full rounded-lg">
                  <Link
                    to="/sign-in"
                    search={state.next === "/dashboard" ? {} : { next: state.next }}
                  >
                    Back to sign in
                  </Link>
                </Button>
                <Button asChild variant="ghost" className="h-11 w-full rounded-lg">
                  <Link to="/dashboard">Continue without signing in</Link>
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
