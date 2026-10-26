import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { AuthForm } from "@/components/auth-form";
import { ClinicalLineArt, Wordmark } from "@/components/brand";
import { useAuth } from "@/lib/auth";
import { pageMeta } from "@/lib/seo";

export const Route = createFileRoute("/sign-in")({
  head: () => pageMeta("Sign in", "Sign in to Clarity Health to save instructions to your account."),
  component: SignIn,
});

function SignIn() {
  const { user, ready } = useAuth();
  const navigate = useNavigate();
  useEffect(() => {
    if (ready && user) navigate({ to: "/dashboard" });
  }, [ready, user, navigate]);

  return (
    <div className="grid min-h-screen lg:grid-cols-[1.1fr_1fr]">
      <aside className="relative hidden overflow-hidden bg-ink p-12 text-ink-foreground lg:flex lg:flex-col">
        <Link to="/dashboard" aria-label="Clarity Health home"><Wordmark /></Link>
        <ClinicalLineArt className="absolute -right-16 top-1/2 h-[560px] w-[560px] -translate-y-1/2 text-ink-foreground" />
        <div className="relative mt-auto max-w-md">
          <p className="eyebrow text-sidebar-muted">Healthcare instructions, made clearer.</p>
          <h2 className="mt-4 font-display text-6xl leading-[0.95]">
            Make healthcare instructions <span className="italic text-sidebar-primary">clearer.</span>
          </h2>
          <p className="mt-6 text-sm leading-relaxed text-sidebar-muted">
            Break instructions into reviewable tasks, trace each one to its source sentence, and test reliability on synthetic cases.
          </p>
        </div>
      </aside>

      <main className="flex flex-col bg-background px-6 py-10 sm:px-12">
        <div className="lg:hidden"><Link to="/dashboard" className="text-foreground"><Wordmark /></Link></div>
        <div className="mx-auto my-auto w-full max-w-sm py-12 animate-rise">
          <p className="eyebrow">Account</p>
          <h1 className="mt-3 font-display text-5xl leading-none">Welcome to Clarity Health</h1>
          <p className="mt-4 mb-8 text-sm text-muted-foreground">
            Sign in to save instructions to your account. Trying the studio with sample text needs no account.
          </p>
          <AuthForm idPrefix="page" onSuccess={() => navigate({ to: "/dashboard" })} />
        </div>
        <p className="text-center text-xs text-muted-foreground">
          <Link to="/privacy" className="underline-offset-4 hover:underline">How we handle data</Link>
        </p>
      </main>
    </div>
  );
}
