import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { authCallbackUrl, DEFAULT_NEXT_PATH } from "@/lib/auth-redirect";

export const credentialsSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, "Enter your email address.")
    .email("Enter a valid email address.")
    .max(255),
  password: z.string().min(8, "Password must be at least 8 characters.").max(128),
});

export async function signIn(email: string, password: string) {
  const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
  return error?.message ?? null;
}

export async function signUp(email: string, password: string) {
  const { data, error } = await supabase.auth.signUp({
    email: email.trim(),
    password,
    options: { emailRedirectTo: window.location.origin + "/dashboard" },
  });
  if (error) return { error: error.message, needsConfirmation: false };
  return { error: null, needsConfirmation: !data.session };
}

export async function sendPasswordReset(email: string) {
  const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
    redirectTo: window.location.origin + "/reset-password",
  });
  return error?.message ?? null;
}

export const GOOGLE_NOT_ENABLED_MESSAGE =
  "Google sign-in isn't enabled for this project yet. Use email and password, or ask the project admin to enable the Google provider.";

export interface AuthProviderStatus {
  google: boolean;
}

let providerStatusPromise: Promise<AuthProviderStatus | null> | null = null;

async function fetchAuthProviderStatus(): Promise<AuthProviderStatus | null> {
  const url = import.meta.env["VITE_SUPABASE_URL"];
  const key = import.meta.env["VITE_SUPABASE_PUBLISHABLE_KEY"];
  if (typeof url !== "string" || !url || typeof key !== "string" || !key) return null;
  try {
    const res = await fetch(`${url.replace(/\/+$/, "")}/auth/v1/settings`, {
      headers: { apikey: key },
    });
    if (!res.ok) return null;
    const body: unknown = await res.json();
    if (typeof body !== "object" || body === null) return null;
    const external = (body as { external?: unknown }).external;
    if (typeof external !== "object" || external === null) return null;
    return { google: (external as { google?: unknown }).google === true };
  } catch {
    return null;
  }
}

/**
 * Which external sign-in providers the Supabase project has enabled, read from the public
 * `/auth/v1/settings` endpoint. Cached per page load; `null` means the check itself failed
 * (network, missing config) and the next call retries.
 */
export function getAuthProviderStatus(): Promise<AuthProviderStatus | null> {
  if (!providerStatusPromise) {
    providerStatusPromise = fetchAuthProviderStatus().then((status) => {
      if (status === null) providerStatusPromise = null;
      return status;
    });
  }
  return providerStatusPromise;
}

export interface GoogleSignInResult {
  /** Human-readable error, or `null` on success. */
  error: string | null;
  /** True when the browser is already on its way to Google (full-page flow). */
  redirected: boolean;
}

/**
 * Start managed Google OAuth through the Lovable auth helper, which works both on the
 * published site and inside the editor preview (where a plain redirect can't run).
 * Checks the provider is enabled first so nobody lands on a raw JSON error page.
 */
export async function signInWithGoogle(
  next: string = DEFAULT_NEXT_PATH,
): Promise<GoogleSignInResult> {
  if (typeof window === "undefined") {
    return { error: "Google sign-in is only available in the browser.", redirected: false };
  }
  try {
    const status = await getAuthProviderStatus();
    if (status && !status.google) return { error: GOOGLE_NOT_ENABLED_MESSAGE, redirected: false };
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: authCallbackUrl(window.location.origin, next),
      extraParams: { prompt: "select_account" },
    });
    if (result.error) {
      const message =
        result.error instanceof Error
          ? result.error.message
          : ((result.error as { message?: string }).message ?? "");
      return {
        error: message || "Couldn't start Google sign-in. Please try again.",
        redirected: false,
      };
    }
    return { error: null, redirected: Boolean(result.redirected) };
  } catch (e) {
    return {
      error:
        e instanceof Error && e.message
          ? e.message
          : "Couldn't start Google sign-in. Please try again.",
      redirected: false,
    };
  }
}

interface AuthCtx {
  user: User | null;
  ready: boolean;
  signOut: () => Promise<void>;
  /** Run `action` if signed in; otherwise open the sign-in dialog explaining `reason`. */
  requireAuth: (reason: string, action?: () => void) => void;
  prompt: { reason: string; action?: (() => void) | undefined } | null;
  closePrompt: () => void;
}

const Ctx = createContext<AuthCtx | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [ready, setReady] = useState(false);
  const [prompt, setPrompt] = useState<AuthCtx["prompt"]>(null);

  useEffect(() => {
    const { data } = supabase.auth.onAuthStateChange((_e, s) => {
      setSession(s);
      setReady(true);
    });
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setReady(true);
    });
    return () => data.subscription.unsubscribe();
  }, []);

  const user = session?.user ?? null;
  const requireAuth = useCallback(
    (reason: string, action?: () => void) => {
      if (user) action?.();
      else setPrompt({ reason, action });
    },
    [user],
  );

  return (
    <Ctx.Provider
      value={{
        user,
        ready,
        signOut: async () => {
          await supabase.auth.signOut();
        },
        requireAuth,
        prompt,
        closePrompt: () => setPrompt(null),
      }}
    >
      {children}
    </Ctx.Provider>
  );
}

export function useAuth() {
  const c = useContext(Ctx);
  if (!c) throw new Error("useAuth must be used inside AuthProvider");
  return c;
}
