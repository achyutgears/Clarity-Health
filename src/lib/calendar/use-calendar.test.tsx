import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { BROWSER_STORAGE_KEY } from "./store";
import type { CareEventInput } from "./types";

const auth = vi.hoisted(() => ({
  value: { user: null as { id: string } | null, ready: true },
}));
const db = vi.hoisted(() => ({
  listResult: { data: [] as unknown[], error: null as unknown, status: 200 },
}));

vi.mock("@/lib/auth", () => ({ useAuth: () => auth.value }));
vi.mock("@/integrations/supabase/client", () => {
  const builder: Record<string, unknown> = {};
  for (const m of [
    "select",
    "eq",
    "order",
    "limit",
    "insert",
    "update",
    "delete",
    "single",
    "maybeSingle",
  ]) {
    builder[m] = () => builder;
  }
  builder["then"] = (res: (v: unknown) => unknown) => Promise.resolve(db.listResult).then(res);
  return { supabase: { from: () => builder } };
});

import { useCalendar } from "./use-calendar";

const input: CareEventInput = {
  title: "Refill pickup",
  kind: "medication",
  startsAt: new Date(2030, 0, 2, 10).toISOString(),
  endsAt: null,
  location: null,
  notes: null,
  reminderMinutes: 0,
};

describe("useCalendar", () => {
  beforeEach(() => {
    localStorage.clear();
    auth.value = { user: null, ready: true };
    db.listResult = { data: [], error: null, status: 200 };
  });

  it("waits for auth before loading", () => {
    auth.value = { user: null, ready: false };
    const { result } = renderHook(() => useCalendar());
    expect(result.current.status).toBe("loading");
  });

  it("uses this browser when signed out and persists real CRUD", async () => {
    const { result } = renderHook(() => useCalendar());
    await waitFor(() => expect(result.current.status).toBe("ready"));
    expect(result.current.storage).toBe("browser");
    expect(result.current.storageReason).toBe("signed-out");

    let res: Awaited<ReturnType<typeof result.current.create>> | undefined;
    await act(async () => {
      res = await result.current.create(input);
    });
    expect(res).toEqual({ ok: true });
    expect(result.current.events).toHaveLength(1);
    expect(localStorage.getItem(BROWSER_STORAGE_KEY)).toContain("Refill pickup");

    const id = result.current.events[0]?.id ?? "";
    await act(async () => {
      res = await result.current.update(id, { ...input, title: "Refill pickup (moved)" });
    });
    expect(res).toEqual({ ok: true });
    expect(result.current.events[0]?.title).toBe("Refill pickup (moved)");

    await act(async () => {
      res = await result.current.remove(id);
    });
    expect(res).toEqual({ ok: true });
    expect(result.current.events).toHaveLength(0);
  });

  it("does not report success or change state when a mutation fails", async () => {
    const { result } = renderHook(() => useCalendar());
    await waitFor(() => expect(result.current.status).toBe("ready"));
    let res: Awaited<ReturnType<typeof result.current.remove>> | undefined;
    await act(async () => {
      res = await result.current.remove("missing");
    });
    expect(res).toEqual({ ok: false, error: "This entry no longer exists." });
    await act(async () => {
      res = await result.current.create({ ...input, title: "" });
    });
    expect(res?.ok).toBe(false);
    expect(result.current.events).toHaveLength(0);
  });

  it("falls back to this browser when the cloud table is missing", async () => {
    auth.value = { user: { id: "user-1" }, ready: true };
    db.listResult = {
      data: [],
      error: { message: "Could not find the table", code: "PGRST205" },
      status: 404,
    };
    const { result } = renderHook(() => useCalendar());
    await waitFor(() => expect(result.current.status).toBe("ready"));
    expect(result.current.storage).toBe("browser");
    expect(result.current.storageReason).toBe("cloud-not-set-up");
  });

  it("surfaces other cloud errors", async () => {
    auth.value = { user: { id: "user-1" }, ready: true };
    db.listResult = {
      data: [],
      error: { message: "permission denied", code: "42501" },
      status: 403,
    };
    const { result } = renderHook(() => useCalendar());
    await waitFor(() => expect(result.current.status).toBe("error"));
    expect(result.current.error).toBe("permission denied");
    expect(result.current.storage).toBe("cloud");
    let res: Awaited<ReturnType<typeof result.current.create>> | undefined;
    await act(async () => {
      res = await result.current.create(input);
    });
    expect(res?.ok).toBe(false);
  });

  it("uses the account when the table exists", async () => {
    auth.value = { user: { id: "user-1" }, ready: true };
    db.listResult = { data: [], error: null, status: 200 };
    const { result } = renderHook(() => useCalendar());
    await waitFor(() => expect(result.current.status).toBe("ready"));
    expect(result.current.storage).toBe("cloud");
    expect(result.current.storageReason).toBe("cloud");
  });
});
