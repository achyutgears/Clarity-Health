import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  signInWithOAuth: vi.fn(),
  signInWithPassword: vi.fn(),
  lovableSignInWithOAuth: vi.fn(),
}));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    auth: {
      signInWithOAuth: mocks.signInWithOAuth,
      signInWithPassword: mocks.signInWithPassword,
      signUp: vi.fn(),
      resetPasswordForEmail: vi.fn(),
      onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } })),
      getSession: vi.fn(async () => ({ data: { session: null } })),
      signOut: vi.fn(),
    },
  },
}));

vi.mock("@/integrations/lovable", () => ({
  lovable: { auth: { signInWithOAuth: mocks.lovableSignInWithOAuth } },
}));

const SUPABASE_URL = "https://example-ref.supabase.co";

function settingsResponse(external: Record<string, boolean>) {
  return new Response(JSON.stringify({ external }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}

async function loadAuth() {
  vi.resetModules();
  return import("@/lib/auth");
}

let fetchMock: ReturnType<typeof vi.fn>;

beforeEach(() => {
  vi.stubEnv("VITE_SUPABASE_URL", SUPABASE_URL);
  vi.stubEnv("VITE_SUPABASE_PUBLISHABLE_KEY", "test-publishable-key");
  fetchMock = vi.fn();
  vi.stubGlobal("fetch", fetchMock);
  mocks.signInWithOAuth.mockReset();
  mocks.signInWithPassword.mockReset();
  mocks.lovableSignInWithOAuth.mockReset();
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("getAuthProviderStatus", () => {
  it("reads the public settings endpoint with the publishable key and caches it", async () => {
    fetchMock.mockResolvedValue(settingsResponse({ email: true, google: false }));
    const { getAuthProviderStatus } = await loadAuth();

    await expect(getAuthProviderStatus()).resolves.toEqual({ google: false });
    await expect(getAuthProviderStatus()).resolves.toEqual({ google: false });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe(`${SUPABASE_URL}/auth/v1/settings`);
    expect(init.headers).toEqual({ apikey: "test-publishable-key" });
  });

  it("reports google: true when the provider is enabled", async () => {
    fetchMock.mockResolvedValue(settingsResponse({ email: true, google: true }));
    const { getAuthProviderStatus } = await loadAuth();
    await expect(getAuthProviderStatus()).resolves.toEqual({ google: true });
  });

  it("returns null on network failure and retries on the next call", async () => {
    fetchMock.mockRejectedValueOnce(new TypeError("Failed to fetch"));
    fetchMock.mockResolvedValueOnce(settingsResponse({ google: true }));
    const { getAuthProviderStatus } = await loadAuth();

    await expect(getAuthProviderStatus()).resolves.toBeNull();
    await expect(getAuthProviderStatus()).resolves.toEqual({ google: true });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("returns null for a non-OK or malformed response", async () => {
    fetchMock.mockResolvedValueOnce(new Response("nope", { status: 500 }));
    fetchMock.mockResolvedValueOnce(new Response("[]", { status: 200 }));
    const { getAuthProviderStatus } = await loadAuth();
    await expect(getAuthProviderStatus()).resolves.toBeNull();
    await expect(getAuthProviderStatus()).resolves.toBeNull();
  });
});

describe("signInWithGoogle", () => {
  it("refuses with a clear message when Google is not enabled, without calling OAuth", async () => {
    fetchMock.mockResolvedValue(settingsResponse({ email: true, google: false }));
    const { signInWithGoogle, GOOGLE_NOT_ENABLED_MESSAGE } = await loadAuth();

    await expect(signInWithGoogle("/calendar")).resolves.toEqual({
      error: GOOGLE_NOT_ENABLED_MESSAGE,
      redirected: false,
    });
    expect(mocks.lovableSignInWithOAuth).not.toHaveBeenCalled();
  });

  it("starts managed OAuth with a safe callback URL when Google is enabled", async () => {
    fetchMock.mockResolvedValue(settingsResponse({ google: true }));
    mocks.lovableSignInWithOAuth.mockResolvedValue({ redirected: true, error: null });
    const { signInWithGoogle } = await loadAuth();

    await expect(signInWithGoogle("//evil.example")).resolves.toEqual({
      error: null,
      redirected: true,
    });
    expect(mocks.lovableSignInWithOAuth).toHaveBeenCalledWith("google", {
      redirect_uri: `${window.location.origin}/auth/callback?next=%2Fdashboard`,
      extraParams: { prompt: "select_account" },
    });
  });

  it("still attempts OAuth when the provider check fails, and surfaces its error", async () => {
    fetchMock.mockRejectedValue(new TypeError("Failed to fetch"));
    mocks.lovableSignInWithOAuth.mockResolvedValue({
      redirected: false,
      error: { message: "Unsupported provider: provider is not enabled" },
    });
    const { signInWithGoogle } = await loadAuth();

    await expect(signInWithGoogle("/dashboard")).resolves.toEqual({
      error: "Unsupported provider: provider is not enabled",
      redirected: false,
    });
    expect(mocks.lovableSignInWithOAuth).toHaveBeenCalledTimes(1);
  });

  it("returns success with redirected: false when the helper sets the session itself", async () => {
    fetchMock.mockResolvedValue(settingsResponse({ google: true }));
    mocks.lovableSignInWithOAuth.mockResolvedValue({ redirected: false, error: null });
    const { signInWithGoogle } = await loadAuth();
    await expect(signInWithGoogle()).resolves.toEqual({ error: null, redirected: false });
  });
});

describe("AuthForm Google button", () => {
  async function renderForm() {
    vi.resetModules();
    const { AuthForm } = await import("@/components/auth-form");
    return render(<AuthForm idPrefix="t" next="/calendar" />);
  }

  it("renders Continue with Google and shows the not-enabled message on click", async () => {
    fetchMock.mockResolvedValue(settingsResponse({ email: true, google: false }));
    await renderForm();

    const google = screen.getByRole("button", { name: /continue with google/i });
    fireEvent.click(google);

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent(/google sign-in isn't enabled for this project yet/i);
    expect(mocks.lovableSignInWithOAuth).not.toHaveBeenCalled();
    expect(google).toBeEnabled();
  });

  it("disables every action while a request is in flight", async () => {
    let resolveSettings: (r: Response) => void = () => {};
    fetchMock.mockReturnValue(
      new Promise<Response>((resolve) => {
        resolveSettings = resolve;
      }),
    );
    await renderForm();

    fireEvent.click(screen.getByRole("button", { name: /continue with google/i }));

    expect(await screen.findByRole("button", { name: /redirecting to google/i })).toBeDisabled();
    expect(screen.getByRole("button", { name: /^sign in$/i })).toBeDisabled();
    expect(screen.getByRole("button", { name: /create an account/i })).toBeDisabled();
    expect(screen.getByRole("button", { name: /forgot password/i })).toBeDisabled();

    // A second click while busy must not start another request.
    fireEvent.click(screen.getByRole("button", { name: /redirecting to google/i }));

    await act(async () => {
      resolveSettings(settingsResponse({ google: false }));
    });
    await waitFor(() =>
      expect(screen.getByRole("button", { name: /continue with google/i })).toBeEnabled(),
    );
    expect(mocks.signInWithOAuth).not.toHaveBeenCalled();
  });

  it("hides the Google button in forgot-password mode and keeps email sign-in", async () => {
    fetchMock.mockResolvedValue(settingsResponse({ google: false }));
    mocks.signInWithPassword.mockResolvedValue({ error: { message: "Invalid login credentials" } });
    await renderForm();

    fireEvent.change(screen.getByLabelText("Email"), { target: { value: "a@example.com" } });
    fireEvent.change(screen.getByLabelText("Password"), { target: { value: "password123" } });
    fireEvent.click(screen.getByRole("button", { name: /^sign in$/i }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Invalid login credentials");
    expect(mocks.signInWithPassword).toHaveBeenCalledWith({
      email: "a@example.com",
      password: "password123",
    });

    fireEvent.click(screen.getByRole("button", { name: /forgot password/i }));
    expect(screen.queryByRole("button", { name: /continue with google/i })).toBeNull();
    expect(screen.getByRole("button", { name: /send reset link/i })).toBeInTheDocument();
  });
});
