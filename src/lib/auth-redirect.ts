/**
 * Pure helpers for auth redirects. Everything here is defensive: values come from the URL,
 * which anyone can craft, so only same-origin relative paths ever leave these functions.
 */

export const DEFAULT_NEXT_PATH = "/dashboard";
export const AUTH_CALLBACK_PATH = "/auth/callback";
const MAX_NEXT_LENGTH = 512;

/** Paths that would loop back into the auth flow if used as a post-sign-in destination. */
const AUTH_FLOW_PATHS = ["/sign-in", AUTH_CALLBACK_PATH];

// eslint-disable-next-line no-control-regex
const CONTROL_CHARS = /[\u0000-\u001F\u007F-\u009F]/;
// eslint-disable-next-line no-control-regex
const CONTROL_CHARS_GLOBAL = /[\u0000-\u001F\u007F-\u009F]/g;
const PROBE_ORIGIN = "https://clarity.invalid";

/**
 * Return `raw` only if it is a same-origin relative path ("/dashboard?tab=1#x"); otherwise
 * `fallback`. Rejects protocol-relative ("//evil"), backslash tricks ("/\\evil"), schemes,
 * control characters, over-long input and auth-flow pages that would cause redirect loops.
 */
export function safeNextPath(raw: unknown, fallback = DEFAULT_NEXT_PATH): string {
  if (typeof raw !== "string") return fallback;
  if (raw.length === 0 || raw.length > MAX_NEXT_LENGTH) return fallback;
  if (raw[0] !== "/" || raw[1] === "/" || raw.includes("\\")) return fallback;
  if (CONTROL_CHARS.test(raw) || /\s/.test(raw)) return fallback;

  let url: URL;
  try {
    url = new URL(raw, PROBE_ORIGIN);
  } catch {
    return fallback;
  }
  if (url.origin !== PROBE_ORIGIN) return fallback;

  const path = url.pathname.replace(/\/+$/, "") || "/";
  if (AUTH_FLOW_PATHS.some((p) => path === p || path.startsWith(p + "/"))) return fallback;

  return url.pathname + url.search + url.hash;
}

/** Build the OAuth `redirectTo` URL: `<origin>/auth/callback?next=<safe path>`. */
export function authCallbackUrl(origin: string, next: string): string {
  const base = origin.replace(/\/+$/, "");
  return `${base}${AUTH_CALLBACK_PATH}?next=${encodeURIComponent(safeNextPath(next))}`;
}

export interface AuthCallbackError {
  /** True when the person backed out of the provider's consent screen. */
  cancelled: boolean;
  /** Human-readable, sanitized message safe to show as plain text. */
  message: string;
}

export const CANCELLED_MESSAGE = "Google sign-in was cancelled.";
export const GENERIC_CALLBACK_ERROR = "Sign-in couldn't be completed. Please try again.";
const MAX_MESSAGE_LENGTH = 200;

/** Collapse whitespace, drop control characters and cap length for display. */
export function sanitizeAuthMessage(raw: string | null | undefined): string {
  if (!raw) return "";
  const cleaned = raw.replace(CONTROL_CHARS_GLOBAL, " ").replace(/\s+/g, " ").trim();
  if (cleaned.length <= MAX_MESSAGE_LENGTH) return cleaned;
  return cleaned.slice(0, MAX_MESSAGE_LENGTH - 1).trimEnd() + "…";
}

function params(raw: string, prefix: "?" | "#"): URLSearchParams {
  const body = raw.startsWith(prefix) ? raw.slice(1) : raw;
  try {
    return new URLSearchParams(body);
  } catch {
    return new URLSearchParams();
  }
}

/**
 * Read an OAuth error from the callback URL. Supabase puts redirect errors in the hash for the
 * implicit flow and in the query string for PKCE, so both are checked (hash wins).
 */
export function parseAuthCallbackError(search: string, hash: string): AuthCallbackError | null {
  const q = params(search, "?");
  const h = params(hash, "#");
  const pick = (key: string) => h.get(key) ?? q.get(key);

  const error = pick("error");
  const code = pick("error_code");
  const description = pick("error_description");
  if (!error && !code && !description) return null;

  const codeMeansCancel = !code || /denied|cancel/i.test(code);
  if (error === "access_denied" && codeMeansCancel) {
    return { cancelled: true, message: CANCELLED_MESSAGE };
  }
  return { cancelled: false, message: sanitizeAuthMessage(description) || GENERIC_CALLBACK_ERROR };
}

/** True when the URL carries a token or code that Supabase will exchange for a session. */
export function hasAuthPayload(search: string, hash: string): boolean {
  const q = params(search, "?");
  const h = params(hash, "#");
  return Boolean(h.get("access_token") || h.get("refresh_token") || q.get("code"));
}
