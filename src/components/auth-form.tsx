import { useState, type FormEvent } from "react";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { credentialsSchema, sendPasswordReset, signIn, signUp } from "@/lib/auth";

type Mode = "sign-in" | "sign-up" | "forgot";

export function AuthForm({ onSuccess, idPrefix = "auth" }: { onSuccess?: () => void; idPrefix?: string }) {
  const [mode, setMode] = useState<Mode>("sign-in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string; form?: string }>({});
  const [info, setInfo] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setInfo(null);
    if (mode === "forgot") {
      const r = credentialsSchema.shape.email.safeParse(email);
      if (!r.success) return setErrors({ email: r.error.issues[0]?.message });
      setErrors({}); setBusy(true);
      const err = await sendPasswordReset(email);
      setBusy(false);
      return err ? setErrors({ form: err }) : setInfo("If an account exists for that email, a reset link is on its way.");
    }
    const parsed = credentialsSchema.safeParse({ email, password });
    if (!parsed.success) {
      const f = parsed.error.flatten().fieldErrors;
      return setErrors({ email: f.email?.[0], password: f.password?.[0] });
    }
    setErrors({}); setBusy(true);
    if (mode === "sign-in") {
      const err = await signIn(email, password);
      setBusy(false);
      if (err) return setErrors({ form: err });
      onSuccess?.();
    } else {
      const r = await signUp(email, password);
      setBusy(false);
      if (r.error) return setErrors({ form: r.error });
      if (r.needsConfirmation) setInfo("Check your inbox to confirm your email, then sign in.");
      else onSuccess?.();
    }
  };

  const field = "mt-1.5 w-full rounded-md border border-input bg-card px-3 py-2.5 text-sm transition-colors focus:border-primary aria-[invalid=true]:border-destructive";
  const eId = `${idPrefix}-email`, pId = `${idPrefix}-password`;

  return (
    <form onSubmit={submit} noValidate className="space-y-4">
      <div>
        <label htmlFor={eId} className="text-sm font-medium">Email</label>
        <input id={eId} type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)}
          aria-invalid={!!errors.email} aria-describedby={errors.email ? `${eId}-err` : undefined} className={field} />
        {errors.email && <p id={`${eId}-err`} className="mt-1 text-xs text-destructive">{errors.email}</p>}
      </div>
      {mode !== "forgot" && (
        <div>
          <div className="flex items-baseline justify-between">
            <label htmlFor={pId} className="text-sm font-medium">Password</label>
            {mode === "sign-in" && (
              <button type="button" onClick={() => { setMode("forgot"); setErrors({}); setInfo(null); }} className="text-xs text-accent-foreground underline-offset-4 hover:underline">
                Forgot password?
              </button>
            )}
          </div>
          <div className="relative">
            <input id={pId} type={show ? "text" : "password"} autoComplete={mode === "sign-up" ? "new-password" : "current-password"}
              value={password} onChange={(e) => setPassword(e.target.value)}
              aria-invalid={!!errors.password} aria-describedby={errors.password ? `${pId}-err` : undefined} className={`${field} pr-10`} />
            <button type="button" onClick={() => setShow((s) => !s)} aria-label={show ? "Hide password" : "Show password"} aria-pressed={show}
              className="absolute right-2 top-1/2 mt-[3px] -translate-y-1/2 rounded p-1 text-muted-foreground hover:text-foreground">
              {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          {errors.password && <p id={`${pId}-err`} className="mt-1 text-xs text-destructive">{errors.password}</p>}
        </div>
      )}
      {errors.form && <p role="alert" className="rounded-md bg-warning-soft px-3 py-2 text-sm text-warning-foreground">{errors.form}</p>}
      {info && <p role="status" className="rounded-md bg-teal-soft px-3 py-2 text-sm text-accent-foreground">{info}</p>}
      <Button type="submit" className="h-11 w-full" disabled={busy}>
        {busy && <Loader2 className="h-4 w-4 animate-spin" />}
        {mode === "sign-in" ? "Sign in" : mode === "sign-up" ? "Create account" : "Send reset link"}
      </Button>
      <p className="text-center text-sm text-muted-foreground">
        {mode === "sign-in" ? (
          <>New to Clarity Health? <button type="button" className="font-medium text-foreground underline-offset-4 hover:underline" onClick={() => { setMode("sign-up"); setErrors({}); setInfo(null); }}>Create an account</button></>
        ) : (
          <button type="button" className="font-medium text-foreground underline-offset-4 hover:underline" onClick={() => { setMode("sign-in"); setErrors({}); setInfo(null); }}>Back to sign in</button>
        )}
      </p>
    </form>
  );
}
