import { useEffect, useRef, useState, type FormEvent } from "react";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { GoogleIcon } from "@/components/google-icon";
import {
  credentialsSchema,
  getAuthProviderStatus,
  sendPasswordReset,
  signIn,
  signInWithGoogle,
  signUp,
} from "@/lib/auth";

type Mode = "sign-in" | "sign-up" | "forgot";
type Busy = "email" | "google" | null;

interface FormErrors {
  email?: string | undefined;
  password?: string | undefined;
  form?: string | undefined;
}

export function AuthForm({
  onSuccess,
  idPrefix = "auth",
  next,
}: {
  onSuccess?: () => void;
  idPrefix?: string;
  /** Same-origin path to return to after Google sign-in. Defaults to the current page. */
  next?: string;
}) {
  const [mode, setMode] = useState<Mode>("sign-in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});
  const [info, setInfo] = useState<string | null>(null);
  const [busy, setBusy] = useState<Busy>(null);
  // Guards against double submits that land before React re-renders the disabled state.
  const inFlight = useRef(false);

  useEffect(() => {
    // Warm the provider check so the Google button answers instantly.
    void getAuthProviderStatus();
    // Coming back from Google via the browser's back button restores a frozen page; reset it.
    const onShow = (e: PageTransitionEvent) => {
      if (e.persisted) {
        inFlight.current = false;
        setBusy(null);
      }
    };
    window.addEventListener("pageshow", onShow);
    return () => window.removeEventListener("pageshow", onShow);
  }, []);

  const start = (kind: Exclude<Busy, null>) => {
    if (inFlight.current) return false;
    inFlight.current = true;
    setBusy(kind);
    return true;
  };
  const stop = () => {
    inFlight.current = false;
    setBusy(null);
  };

  const switchMode = (m: Mode) => {
    if (inFlight.current) return;
    setMode(m);
    setErrors({});
    setInfo(null);
  };

  const continueWithGoogle = async () => {
    setInfo(null);
    setErrors({});
    if (!start("google")) return;
    const target = next ?? window.location.pathname + window.location.search;
    const err = await signInWithGoogle(target);
    // On success the browser is already leaving for Google, so keep the busy state.
    if (err) {
      stop();
      setErrors({ form: err });
    }
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (inFlight.current) return;
    setInfo(null);
    if (mode === "forgot") {
      const r = credentialsSchema.shape.email.safeParse(email);
      if (!r.success) return setErrors({ email: r.error.issues[0]?.message });
      setErrors({});
      if (!start("email")) return;
      const err = await sendPasswordReset(email);
      stop();
      return err
        ? setErrors({ form: err })
        : setInfo("If an account exists for that email, a reset link is on its way.");
    }
    const parsed = credentialsSchema.safeParse({ email, password });
    if (!parsed.success) {
      const f = parsed.error.flatten().fieldErrors;
      return setErrors({ email: f.email?.[0], password: f.password?.[0] });
    }
    setErrors({});
    if (!start("email")) return;
    if (mode === "sign-in") {
      const err = await signIn(email, password);
      stop();
      if (err) return setErrors({ form: err });
      onSuccess?.();
    } else {
      const r = await signUp(email, password);
      stop();
      if (r.error) return setErrors({ form: r.error });
      if (r.needsConfirmation) setInfo("Check your inbox to confirm your email, then sign in.");
      else onSuccess?.();
    }
  };

  const isBusy = busy !== null;
  const field =
    "h-11 w-full rounded-lg border border-input bg-card px-3 text-sm transition-colors focus:border-primary aria-[invalid=true]:border-destructive";
  const textButton =
    "inline-flex min-h-10 items-center rounded-sm font-medium underline-offset-4 hover:underline disabled:pointer-events-none disabled:opacity-50";
  const eId = `${idPrefix}-email`,
    pId = `${idPrefix}-password`;
  const status =
    busy === "google"
      ? "Redirecting to Google…"
      : busy === "email"
        ? mode === "forgot"
          ? "Sending reset link…"
          : mode === "sign-up"
            ? "Creating your account…"
            : "Signing in…"
        : "";

  return (
    <form onSubmit={submit} noValidate className="space-y-4" aria-busy={isBusy}>
      {mode !== "forgot" && (
        <>
          <Button
            type="button"
            variant="outline"
            onClick={continueWithGoogle}
            disabled={isBusy}
            className="h-11 w-full gap-3 rounded-lg border-[#747775] bg-white text-[#1f1f1f] shadow-sm hover:bg-[#f8f9fa] hover:text-[#1f1f1f]"
          >
            {busy === "google" ? (
              <Loader2 className="animate-spin text-[#5f6368]" aria-hidden />
            ) : (
              <GoogleIcon className="h-[18px] w-[18px]" />
            )}
            {busy === "google" ? "Redirecting to Google…" : "Continue with Google"}
          </Button>
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <span aria-hidden className="h-px flex-1 bg-border" />
            <span className="eyebrow">or</span>
            <span aria-hidden className="h-px flex-1 bg-border" />
          </div>
        </>
      )}

      <div>
        <label htmlFor={eId} className="text-sm font-medium">
          Email
        </label>
        <input
          id={eId}
          type="email"
          autoComplete="email"
          inputMode="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          aria-invalid={!!errors.email}
          aria-describedby={errors.email ? `${eId}-err` : undefined}
          className={`mt-1.5 ${field}`}
        />
        {errors.email && (
          <p id={`${eId}-err`} className="mt-1 text-xs text-destructive">
            {errors.email}
          </p>
        )}
      </div>
      {mode !== "forgot" && (
        <div>
          <div className="flex items-center justify-between">
            <label htmlFor={pId} className="text-sm font-medium">
              Password
            </label>
            {mode === "sign-in" && (
              <button
                type="button"
                onClick={() => switchMode("forgot")}
                disabled={isBusy}
                className={`${textButton} -my-2 px-1 text-xs text-accent-foreground`}
              >
                Forgot password?
              </button>
            )}
          </div>
          <div className="relative mt-1.5">
            <input
              id={pId}
              type={show ? "text" : "password"}
              autoComplete={mode === "sign-up" ? "new-password" : "current-password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              aria-invalid={!!errors.password}
              aria-describedby={errors.password ? `${pId}-err` : undefined}
              className={`${field} pr-12`}
            />
            <button
              type="button"
              onClick={() => setShow((s) => !s)}
              aria-label={show ? "Hide password" : "Show password"}
              aria-pressed={show}
              className="absolute right-0.5 top-1/2 inline-flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground hover:text-foreground"
            >
              {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          {errors.password && (
            <p id={`${pId}-err`} className="mt-1 text-xs text-destructive">
              {errors.password}
            </p>
          )}
        </div>
      )}
      {errors.form && (
        <p
          role="alert"
          className="rounded-lg bg-warning-soft px-3 py-2 text-sm text-warning-foreground"
        >
          {errors.form}
        </p>
      )}
      {info && (
        <p
          role="status"
          className="rounded-lg bg-teal-soft px-3 py-2 text-sm text-accent-foreground"
        >
          {info}
        </p>
      )}
      <p className="sr-only" aria-live="polite">
        {status}
      </p>
      <Button type="submit" className="h-11 w-full rounded-lg" disabled={isBusy}>
        {busy === "email" && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
        {mode === "sign-in" ? "Sign in" : mode === "sign-up" ? "Create account" : "Send reset link"}
      </Button>
      <p className="text-center text-sm text-muted-foreground">
        {mode === "sign-in" ? (
          <>
            New to Clarity Health?{" "}
            <button
              type="button"
              disabled={isBusy}
              className={`${textButton} text-foreground`}
              onClick={() => switchMode("sign-up")}
            >
              Create an account
            </button>
          </>
        ) : (
          <button
            type="button"
            disabled={isBusy}
            className={`${textButton} text-foreground`}
            onClick={() => switchMode("sign-in")}
          >
            Back to sign in
          </button>
        )}
      </p>
    </form>
  );
}
