import { beforeEach, describe, expect, it } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import {
  BROWSER_STORAGE_KEY,
  BrowserCalendarStore,
  CloudCalendarStore,
  isMissingTableError,
  resolveCalendarStore,
} from "./store";
import type { CareEventInput } from "./types";

const input = (over: Partial<CareEventInput> = {}): CareEventInput => ({
  title: "Physical therapy",
  kind: "appointment",
  startsAt: new Date(2026, 9, 27, 10).toISOString(),
  endsAt: new Date(2026, 9, 27, 11).toISOString(),
  location: null,
  notes: null,
  reminderMinutes: 60,
  ...over,
});

interface Response {
  data?: unknown;
  error?: { message: string; code?: string } | null;
  status?: number;
  count?: number | null;
}

/** Minimal stand-in for the PostgREST builder: every method chains, awaiting resolves `res`. */
function fakeClient(
  responses: Partial<Record<"select" | "insert" | "update" | "delete", Response>>,
) {
  const calls: Array<{ op: string; args: unknown[] }> = [];
  const from = (table: string) => {
    calls.push({ op: "from", args: [table] });
    let res: Response = {};
    const builder: Record<string, unknown> = {};
    const chain =
      (op: string, setRes?: keyof typeof responses) =>
      (...args: unknown[]) => {
        calls.push({ op, args });
        if (setRes && !("primed" in builder)) {
          res = responses[setRes] ?? {};
          builder["primed"] = true;
        }
        return builder;
      };
    Object.assign(builder, {
      select: chain("select", "select"),
      insert: chain("insert", "insert"),
      update: chain("update", "update"),
      delete: chain("delete", "delete"),
      eq: chain("eq"),
      order: chain("order"),
      limit: chain("limit"),
      single: chain("single"),
      maybeSingle: chain("maybeSingle"),
      then: (resolve: (v: unknown) => unknown, reject: (e: unknown) => unknown) =>
        Promise.resolve({
          data: res.data ?? null,
          error: res.error ?? null,
          status: res.status ?? 200,
          count: res.count ?? null,
        }).then(resolve, reject),
    });
    return builder;
  };
  return { client: { from } as unknown as SupabaseClient<Database>, calls };
}

const row = {
  id: "row-1",
  user_id: "user-1",
  title: "Physical therapy",
  kind: "appointment",
  starts_at: "2026-10-27T17:00:00+00:00",
  ends_at: null,
  location: "Suite 4",
  notes: null,
  reminder_minutes: 15,
  created_at: "2026-10-26T00:00:00+00:00",
  updated_at: "2026-10-26T00:00:00+00:00",
};

describe("BrowserCalendarStore", () => {
  beforeEach(() => localStorage.clear());

  it("creates, lists, updates and removes entries in localStorage", async () => {
    const store = new BrowserCalendarStore(localStorage);
    expect(await store.list()).toEqual([]);

    const later = await store.create(
      input({ title: "Later", startsAt: new Date(2026, 9, 30).toISOString(), endsAt: null }),
    );
    const sooner = await store.create(input({ title: "Sooner" }));
    expect(later.id).not.toBe(sooner.id);
    expect((await store.list()).map((e) => e.title)).toEqual(["Sooner", "Later"]);
    expect(JSON.parse(localStorage.getItem(BROWSER_STORAGE_KEY) ?? "[]")).toHaveLength(2);

    const updated = await store.update(
      sooner.id,
      input({ title: "Sooner (moved)", reminderMinutes: null }),
    );
    expect(updated.createdAt).toBe(sooner.createdAt);
    expect(updated.reminderMinutes).toBeNull();
    expect((await new BrowserCalendarStore(localStorage).list()).map((e) => e.title)).toContain(
      "Sooner (moved)",
    );

    await store.remove(later.id);
    expect((await store.list()).map((e) => e.id)).toEqual([sooner.id]);
  });

  it("rejects updates/removals of unknown ids without writing", async () => {
    const store = new BrowserCalendarStore(localStorage);
    await expect(store.update("nope", input())).rejects.toThrow(/no longer exists/);
    await expect(store.remove("nope")).rejects.toThrow(/no longer exists/);
    expect(localStorage.getItem(BROWSER_STORAGE_KEY)).toBeNull();
  });

  it("refuses invalid input instead of storing it", async () => {
    const store = new BrowserCalendarStore(localStorage);
    await expect(
      store.create(input({ endsAt: new Date(2026, 9, 27, 9).toISOString() })),
    ).rejects.toThrow(/invalid/);
    await expect(store.create(input({ title: "" }))).rejects.toThrow(/invalid/);
    expect(await store.list()).toEqual([]);
  });

  it("ignores corrupt JSON and skips malformed items", async () => {
    localStorage.setItem(BROWSER_STORAGE_KEY, "{not json");
    expect(await new BrowserCalendarStore(localStorage).list()).toEqual([]);

    const good = await new BrowserCalendarStore(localStorage).create(input());
    const stored = JSON.parse(localStorage.getItem(BROWSER_STORAGE_KEY) ?? "[]") as unknown[];
    localStorage.setItem(
      BROWSER_STORAGE_KEY,
      JSON.stringify([
        ...stored,
        { id: "bad", title: 5 },
        null,
        "x",
        { ...good, id: "k", kind: "booking" },
      ]),
    );
    expect((await new BrowserCalendarStore(localStorage).list()).map((e) => e.id)).toEqual([
      good.id,
    ]);

    localStorage.setItem(BROWSER_STORAGE_KEY, JSON.stringify({ not: "an array" }));
    expect(await new BrowserCalendarStore(localStorage).list()).toEqual([]);
  });

  it("reports a write failure instead of pretending to save", async () => {
    const failing = {
      getItem: () => null,
      setItem: () => {
        throw new Error("QuotaExceededError");
      },
    } as unknown as Storage;
    await expect(new BrowserCalendarStore(failing).create(input())).rejects.toThrow(
      /Couldn't save/,
    );
    await expect(new BrowserCalendarStore(null).create(input())).rejects.toThrow(/local storage/);
  });
});

describe("CloudCalendarStore", () => {
  it("lists the user's rows ordered by start and maps columns", async () => {
    const { client, calls } = fakeClient({ select: { data: [row] } });
    const events = await new CloudCalendarStore(client, "user-1").list();
    expect(events).toEqual([
      expect.objectContaining({
        id: "row-1",
        startsAt: row.starts_at,
        location: "Suite 4",
        reminderMinutes: 15,
      }),
    ]);
    expect(calls).toContainEqual({ op: "from", args: ["calendar_events"] });
    expect(calls).toContainEqual({ op: "eq", args: ["user_id", "user-1"] });
  });

  it("never sends user_id on insert or update", async () => {
    const { client, calls } = fakeClient({ insert: { data: row }, update: { data: row } });
    const store = new CloudCalendarStore(client, "user-1");
    await store.create(input());
    await store.update("row-1", input());
    const writes = calls.filter((c) => c.op === "insert" || c.op === "update");
    expect(writes).toHaveLength(2);
    for (const w of writes) expect(w.args[0]).not.toHaveProperty("user_id");
  });

  it("surfaces errors and missing rows", async () => {
    const failing = fakeClient({
      insert: { error: { message: "new row violates check", code: "23514" }, status: 400 },
    });
    await expect(new CloudCalendarStore(failing.client, "u").create(input())).rejects.toThrow(
      "new row violates check",
    );
    const gone = fakeClient({ update: { data: null } });
    await expect(new CloudCalendarStore(gone.client, "u").update("x", input())).rejects.toThrow(
      /no longer exists/,
    );
    const none = fakeClient({ delete: { count: 0 } });
    await expect(new CloudCalendarStore(none.client, "u").remove("x")).rejects.toThrow(
      /no longer exists/,
    );
    const ok = fakeClient({ delete: { count: 1 } });
    await expect(new CloudCalendarStore(ok.client, "u").remove("x")).resolves.toBeUndefined();
  });
});

describe("resolveCalendarStore", () => {
  beforeEach(() => localStorage.clear());

  it("uses the browser when signed out without touching the cloud", async () => {
    const { client, calls } = fakeClient({});
    const r = await resolveCalendarStore({ userId: null, client, storage: localStorage });
    expect(r).toMatchObject({ ok: true, reason: "signed-out" });
    if (r.ok) expect(r.store.kind).toBe("browser");
    expect(calls).toHaveLength(0);
  });

  it("uses the cloud when the table exists", async () => {
    const { client } = fakeClient({ select: { data: [row] } });
    const r = await resolveCalendarStore({ userId: "user-1", client, storage: localStorage });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.reason).toBe("cloud");
    expect(r.store.kind).toBe("cloud");
    expect(r.events).toHaveLength(1);
  });

  it.each([
    ["PGRST205", 404],
    ["42P01", 400],
    [undefined, 404],
  ])("falls back to the browser when the table is missing (%s / %s)", async (code, status) => {
    const { client } = fakeClient({
      select: { error: { message: "missing", ...(code ? { code } : {}) }, status },
    });
    const r = await resolveCalendarStore({ userId: "user-1", client, storage: localStorage });
    expect(r).toMatchObject({ ok: true, reason: "cloud-not-set-up" });
    if (r.ok) expect(r.store.kind).toBe("browser");
  });

  it("surfaces other cloud errors instead of silently switching", async () => {
    const { client } = fakeClient({
      select: { error: { message: "JWT expired", code: "PGRST301" }, status: 401 },
    });
    const r = await resolveCalendarStore({ userId: "user-1", client, storage: localStorage });
    expect(r).toEqual({ ok: false, storage: "cloud", reason: "cloud", error: "JWT expired" });
  });

  it("classifies missing-table errors", () => {
    expect(isMissingTableError({ code: "PGRST205" })).toBe(true);
    expect(isMissingTableError({ code: "42P01" })).toBe(true);
    expect(isMissingTableError({ status: 404 })).toBe(true);
    expect(isMissingTableError({ code: "PGRST301", status: 401 })).toBe(false);
    expect(isMissingTableError(null)).toBe(false);
  });
});
