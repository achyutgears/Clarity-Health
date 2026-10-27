import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { AuthBackdrop, AuthBrandPanel } from "@/components/auth-backdrop";
import { AuthForm } from "@/components/auth-form";
import { Wordmark } from "@/components/brand";
import { useAuth } from "@/lib/auth";
import { safeNextPath } from "@/lib/auth-redirect";
import { pageMeta } from "@/lib/seo";

interface SignInSearch {
  next?: string;
}

export const Route = createFileRoute("/sign-in")({
  head: () =>
    pageMeta("Sign in", "Sign in to Clarity Health to save instructions to your account."),
  validateSearch: (search: Record<string, unknown>): SignInSearch => {
    const next = search["next"];
    return typeof next === "string" && next.length > 0 && next.length <= 512 ? { next } : {};
  },
  component: SignIn,
});

function SignIn() {
  const { user, ready } = useAuth();
  const { next } = Route.useSearch();
  const navigate = useNavigate();
  const target = safeNextPath(next);

  useEffect(() => {
    if (ready && user) navigate({ href: target, replace: true });
  }, [ready, user, navigate, target]);

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
            <p className="eyebrow">Account</p>
            <h1 className="mt-3 font-display text-4xl leading-none tracking-tight sm:text-5xl">
              Welcome to Clarity Health
            </h1>
            <p className="mt-3 mb-7 text-sm leading-relaxed text-muted-foreground">
              Sign in to sync your care calendar and saved instructions to your account. Finding
              care, Mindful Moments and the instruction studio work without one.
            </p>
            <AuthForm
              idPrefix="page"
              next={target}
              onSuccess={() => navigate({ href: target, replace: true })}
            />
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
