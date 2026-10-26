import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";

export const credentialsSchema = z.object({
  email: z.string().trim().min(1, "Enter your email address.").email("Enter a valid email address.").max(255),
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

interface AuthCtx {
  user: User | null;
  ready: boolean;
  signOut: () => Promise<void>;
  /** Run `action` if signed in; otherwise open the sign-in dialog explaining `reason`. */
  requireAuth: (reason: string, action?: () => void) => void;
  prompt: { reason: string; action?: () => void } | null;
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
        signOut: async () => { await supabase.auth.signOut(); },
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
