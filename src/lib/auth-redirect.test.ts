import { describe, expect, it } from "vitest";
import {
  authCallbackUrl,
  CANCELLED_MESSAGE,
  GENERIC_CALLBACK_ERROR,
  hasAuthPayload,
  parseAuthCallbackError,
  safeNextPath,
  sanitizeAuthMessage,
} from "./auth-redirect";

describe("safeNextPath", () => {
  it("keeps same-origin relative paths, including query and hash", () => {
    expect(safeNextPath("/dashboard")).toBe("/dashboard");
    expect(safeNextPath("/instructions")).toBe("/instructions");
    expect(safeNextPath("/calendar?view=week#today")).toBe("/calendar?view=week#today");
    expect(safeNextPath("/")).toBe("/");
  });

  it("falls back for non-strings and empty input", () => {
    expect(safeNextPath(undefined)).toBe("/dashboard");
    expect(safeNextPath(null)).toBe("/dashboard");
    expect(safeNextPath(42)).toBe("/dashboard");
    expect(safeNextPath({ toString: () => "/x" })).toBe("/dashboard");
    expect(safeNextPath(["/x"])).toBe("/dashboard");
    expect(safeNextPath("")).toBe("/dashboard");
  });

  it("honours a custom fallback", () => {
    expect(safeNextPath("https://evil.example", "/locations")).toBe("/locations");
  });

  it.each([
    "//evil.example",
    "//evil.example/path",
    "///evil.example",
    "/\\evil.example",
    "\\\\evil.example",
    "/path\\to",
    "\\/evil.example",
    "https://evil.example",
    "http://evil.example",
    "HTTP://evil.example",
    "javascript:alert(1)",
    "JavaScript:alert(1)",
    " javascript:alert(1)",
    "data:text/html,<script>alert(1)</script>",
    "vbscript:msgbox(1)",
    "evil.example",
    "dashboard",
    "./dashboard",
    "../dashboard",
    "?next=/x",
    "#hash",
    "/\t/evil.example",
    "/\n/evil.example",
    "/\r//evil.example",
    "/\u0000evil",
    "/\u007Fevil",
    "/ /evil.example",
    " /dashboard",
    "/dashboard ",
  ])("rejects attack string %j", (raw) => {
    expect(safeNextPath(raw)).toBe("/dashboard");
  });

  it("rejects overly long paths", () => {
    expect(safeNextPath("/" + "a".repeat(511))).toBe("/" + "a".repeat(511));
    expect(safeNextPath("/" + "a".repeat(512))).toBe("/dashboard");
  });

  it("keeps percent-encoded segments on the same origin", () => {
    expect(safeNextPath("/%2F%2Fevil.example")).toBe("/%2F%2Fevil.example");
    expect(safeNextPath("/a/../b")).toBe("/b");
  });

  it("rejects auth-flow pages to avoid redirect loops", () => {
    expect(safeNextPath("/sign-in")).toBe("/dashboard");
    expect(safeNextPath("/sign-in/")).toBe("/dashboard");
    expect(safeNextPath("/sign-in?next=/x")).toBe("/dashboard");
    expect(safeNextPath("/auth/callback")).toBe("/dashboard");
    expect(safeNextPath("/auth/callback?next=/dashboard")).toBe("/dashboard");
    expect(safeNextPath("/sign-in-help")).toBe("/sign-in-help");
  });
});

describe("authCallbackUrl", () => {
  it("builds an encoded callback URL", () => {
    expect(authCallbackUrl("http://localhost:8080", "/calendar?view=week")).toBe(
      "http://localhost:8080/auth/callback?next=%2Fcalendar%3Fview%3Dweek",
    );
  });

  it("strips a trailing slash from the origin", () => {
    expect(authCallbackUrl("https://app.example/", "/dashboard")).toBe(
      "https://app.example/auth/callback?next=%2Fdashboard",
    );
  });

  it("never embeds an unsafe next path", () => {
    expect(authCallbackUrl("https://app.example", "//evil.example")).toBe(
      "https://app.example/auth/callback?next=%2Fdashboard",
    );
    expect(authCallbackUrl("https://app.example", "javascript:alert(1)")).toBe(
      "https://app.example/auth/callback?next=%2Fdashboard",
    );
  });
});

describe("parseAuthCallbackError", () => {
  it("returns null when the URL has no error", () => {
    expect(parseAuthCallbackError("?next=%2Fdashboard", "")).toBeNull();
    expect(parseAuthCallbackError("", "#access_token=abc&refresh_token=def")).toBeNull();
  });

  it("treats access_denied as a cancellation (hash)", () => {
    expect(
      parseAuthCallbackError("", "#error=access_denied&error_description=User+denied+access"),
    ).toEqual({ cancelled: true, message: CANCELLED_MESSAGE });
  });

  it("treats access_denied as a cancellation (query)", () => {
    expect(parseAuthCallbackError("?error=access_denied", "")).toEqual({
      cancelled: true,
      message: CANCELLED_MESSAGE,
    });
  });

  it("does not call a non-cancel access_denied code a cancellation", () => {
    const r = parseAuthCallbackError(
      "",
      "#error=access_denied&error_code=otp_expired&error_description=Email+link+is+invalid+or+has+expired",
    );
    expect(r).toEqual({ cancelled: false, message: "Email link is invalid or has expired" });
  });

  it("shows a sanitized description for other errors", () => {
    const r = parseAuthCallbackError(
      "?error=server_error&error_description=Unable%20to%0Aexchange%09external%20code",
      "",
    );
    expect(r).toEqual({ cancelled: false, message: "Unable to exchange external code" });
  });

  it("prefers the hash over the query string", () => {
    const r = parseAuthCallbackError(
      "?error=server_error&error_description=from+query",
      "#error=server_error&error_description=from+hash",
    );
    expect(r?.message).toBe("from hash");
  });

  it("falls back to a generic message without a description", () => {
    expect(parseAuthCallbackError("?error=server_error", "")).toEqual({
      cancelled: false,
      message: GENERIC_CALLBACK_ERROR,
    });
  });
});

describe("sanitizeAuthMessage", () => {
  it("caps length and strips control characters", () => {
    const long = "x".repeat(500);
    const out = sanitizeAuthMessage(long);
    expect(out.length).toBeLessThanOrEqual(200);
    expect(out.endsWith("…")).toBe(true);
    expect(sanitizeAuthMessage("a\u0000b\u001Fc")).toBe("a b c");
    expect(sanitizeAuthMessage(null)).toBe("");
  });
});

describe("hasAuthPayload", () => {
  it("detects implicit tokens and PKCE codes", () => {
    expect(hasAuthPayload("", "#access_token=a&refresh_token=b")).toBe(true);
    expect(hasAuthPayload("?code=abc", "")).toBe(true);
    expect(hasAuthPayload("?next=%2Fdashboard", "")).toBe(false);
  });
});
