import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { sortByStart } from "./dates";
import {
  isEventKind,
  isReminderMinutes,
  type CalendarStorage,
  type CareEvent,
  type CareEventInput,
  type StorageReason,
} from "./types";
import { storedEventSchema } from "./validation";

export interface CalendarStore {
  kind: CalendarStorage;
  list(): Promise<CareEvent[]>;
  create(input: CareEventInput): Promise<CareEvent>;
  update(id: string, input: CareEventInput): Promise<CareEvent>;
  remove(id: string): Promise<void>;
}

/** Error carrying the PostgREST / Postgres code and HTTP status when known. */
export class CalendarStoreError extends Error {
  readonly code: string | null;
  readonly status: number | null;
  constructor(message: string, code: string | null = null, status: number | null = null) {
    super(message);
    this.name = "CalendarStoreError";
    this.code = code;
    this.status = status;
  }
}

type Client = SupabaseClient<Database>;
type Row = Database["public"]["Tables"]["calendar_events"]["Row"];

const TABLE = "calendar_events";
export const BROWSER_STORAGE_KEY = "clarity-health.calendar.v1";

/** PostgREST "table not in schema cache" or Postgres "undefined_table", or a bare 404. */
export function isMissingTableError(err: unknown): boolean {
  if (!err || typeof err !== "object") return false;
  const e = err as { code?: unknown; status?: unknown };
  return e.code === "PGRST205" || e.code === "42P01" || e.status === 404;
}

function toStoreError(
  error: { message?: string; code?: string } | null,
  status: number | null,
  fallback: string,
): CalendarStoreError {
  return new CalendarStoreError(error?.message || fallback, error?.code ?? null, status);
}

export function rowToEvent(row: Row): CareEvent {
  if (!isEventKind(row.kind)) {
    throw new CalendarStoreError(`Unexpected entry type "${row.kind}".`);
  }
  return {
    id: row.id,
    title: row.title,
    kind: row.kind,
    startsAt: row.starts_at,
    endsAt: row.ends_at,
    location: row.location,
    notes: row.notes,
    reminderMinutes: isReminderMinutes(row.reminder_minutes) ? row.reminder_minutes : null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function inputToColumns(input: CareEventInput) {
  return {
    title: input.title,
    kind: input.kind,
    starts_at: input.startsAt,
    ends_at: input.endsAt,
    location: input.location,
    notes: input.notes,
    reminder_minutes: input.reminderMinutes,
  };
}

/** Supabase-backed store. RLS scopes every row to the signed-in user. */
export class CloudCalendarStore implements CalendarStore {
  readonly kind = "cloud" as const;
  constructor(
    private readonly client: Client,
    private readonly userId: string,
  ) {}

  async list(): Promise<CareEvent[]> {
    const { data, error, status } = await this.client
      .from(TABLE)
      .select("*")
      .eq("user_id", this.userId)
      .order("starts_at", { ascending: true })
      .limit(1000);
    if (error) throw toStoreError(error, status, "Couldn't load your calendar.");
    const events: CareEvent[] = [];
    for (const row of data ?? []) {
      try {
        events.push(rowToEvent(row));
      } catch {
        // Skip rows this version of the app can't display rather than failing the whole list.
      }
    }
    return events;
  }

  async create(input: CareEventInput): Promise<CareEvent> {
    // user_id is filled by the column default (auth.uid()) and enforced by RLS.
    const { data, error, status } = await this.client
      .from(TABLE)
      .insert(inputToColumns(input))
      .select("*")
      .single();
    if (error || !data) throw toStoreError(error, status, "Couldn't save this entry.");
    return rowToEvent(data);
  }

  async update(id: string, input: CareEventInput): Promise<CareEvent> {
    // Never send user_id on update — ownership can't be reassigned (RLS WITH CHECK too).
    const { data, error, status } = await this.client
      .from(TABLE)
      .update(inputToColumns(input))
      .eq("id", id)
      .select("*")
      .maybeSingle();
    if (error) throw toStoreError(error, status, "Couldn't update this entry.");
    if (!data) throw new CalendarStoreError("This entry no longer exists.", null, status);
    return rowToEvent(data);
  }

  async remove(id: string): Promise<void> {
    const { error, status, count } = await this.client
      .from(TABLE)
      .delete({ count: "exact" })
      .eq("id", id);
    if (error) throw toStoreError(error, status, "Couldn't delete this entry.");
    if (count === 0) throw new CalendarStoreError("This entry no longer exists.", null, status);
  }
}

function newId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `local-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

function defaultStorage(): Storage | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

/** localStorage-backed store for signed-out use or when account sync isn't set up yet. */
export class BrowserCalendarStore implements CalendarStore {
  readonly kind = "browser" as const;
  private readonly storage: Storage | null;
  constructor(
    storage: Storage | null = defaultStorage(),
    private readonly now: () => Date = () => new Date(),
  ) {
    this.storage = storage;
  }

  private read(): CareEvent[] {
    if (!this.storage) return [];
    let raw: string | null;
    try {
      raw = this.storage.getItem(BROWSER_STORAGE_KEY);
    } catch {
      return [];
    }
    if (!raw) return [];
    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      return [];
    }
    if (!Array.isArray(parsed)) return [];
    const events: CareEvent[] = [];
    for (const item of parsed) {
      // Corrupt or foreign items are skipped instead of breaking the whole calendar.
      const r = storedEventSchema.safeParse(item);
      if (!r.success) continue;
      const { reminderMinutes, ...rest } = r.data;
      events.push({
        ...rest,
        reminderMinutes: isReminderMinutes(reminderMinutes) ? reminderMinutes : null,
      });
    }
    return events;
  }

  private write(events: CareEvent[]) {
    if (!this.storage) {
      throw new CalendarStoreError(
        "This browser isn't allowing local storage, so nothing was saved.",
      );
    }
    try {
      this.storage.setItem(BROWSER_STORAGE_KEY, JSON.stringify(events));
    } catch {
      throw new CalendarStoreError(
        "Couldn't save in this browser — storage may be full or blocked.",
      );
    }
  }

  private build(id: string, input: CareEventInput, createdAt: string): CareEvent {
    const event: CareEvent = { id, ...input, createdAt, updatedAt: this.now().toISOString() };
    const check = storedEventSchema.safeParse(event);
    if (!check.success) throw new CalendarStoreError("This entry has invalid details.");
    return event;
  }

  async list(): Promise<CareEvent[]> {
    return sortByStart(this.read());
  }

  async create(input: CareEventInput): Promise<CareEvent> {
    const events = this.read();
    const event = this.build(newId(), input, this.now().toISOString());
    this.write([...events, event]);
    return event;
  }

  async update(id: string, input: CareEventInput): Promise<CareEvent> {
    const events = this.read();
    const existing = events.find((e) => e.id === id);
    if (!existing) throw new CalendarStoreError("This entry no longer exists.");
    const event = this.build(id, input, existing.createdAt);
    this.write(events.map((e) => (e.id === id ? event : e)));
    return event;
  }

  async remove(id: string): Promise<void> {
    const events = this.read();
    if (!events.some((e) => e.id === id)) {
      throw new CalendarStoreError("This entry no longer exists.");
    }
    this.write(events.filter((e) => e.id !== id));
  }
}

export type StoreResolution =
  | { ok: true; store: CalendarStore; reason: StorageReason; events: CareEvent[] }
  | { ok: false; storage: CalendarStorage; reason: StorageReason; error: string };

/**
 * Pick where entries live:
 * - signed out -> this browser ("signed-out")
 * - signed in and the calendar table exists -> account ("cloud")
 * - signed in but the table is missing (migration pending) -> this browser ("cloud-not-set-up")
 * - signed in and any other cloud error -> surface it; never switch silently.
 */
export async function resolveCalendarStore(opts: {
  userId: string | null;
  client: Client | (() => Client);
  storage?: Storage | null;
}): Promise<StoreResolution> {
  const browser = () =>
    opts.storage === undefined
      ? new BrowserCalendarStore()
      : new BrowserCalendarStore(opts.storage);

  if (!opts.userId) {
    const store = browser();
    return { ok: true, store, reason: "signed-out", events: await store.list() };
  }

  const client = typeof opts.client === "function" ? opts.client() : opts.client;
  const cloud = new CloudCalendarStore(client, opts.userId);
  try {
    const events = await cloud.list();
    return { ok: true, store: cloud, reason: "cloud", events };
  } catch (err) {
    if (isMissingTableError(err)) {
      const store = browser();
      return { ok: true, store, reason: "cloud-not-set-up", events: await store.list() };
    }
    return {
      ok: false,
      storage: "cloud",
      reason: "cloud",
      error: err instanceof Error ? err.message : "Couldn't load your calendar.",
    };
  }
}
