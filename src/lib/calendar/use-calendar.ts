import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { sortByStart } from "./dates";
import { BROWSER_STORAGE_KEY, resolveCalendarStore, type CalendarStore } from "./store";
import type {
  CalendarStorage,
  CareEvent,
  CareEventInput,
  MutationResult,
  StorageReason,
} from "./types";

export interface UseCalendar {
  events: CareEvent[];
  status: "loading" | "ready" | "error";
  error: string | null;
  storage: CalendarStorage;
  storageReason: StorageReason;
  create(input: CareEventInput): Promise<MutationResult>;
  update(id: string, input: CareEventInput): Promise<MutationResult>;
  remove(id: string): Promise<MutationResult>;
  refresh(): Promise<void>;
}

const message = (err: unknown, fallback: string) =>
  err instanceof Error && err.message ? err.message : fallback;

const NOT_READY: MutationResult = {
  ok: false,
  error: "Your calendar hasn't finished loading. Try again in a moment.",
};

export function useCalendar(): UseCalendar {
  const { user, ready } = useAuth();
  const userId = user?.id ?? null;

  const [events, setEvents] = useState<CareEvent[]>([]);
  const [status, setStatus] = useState<UseCalendar["status"]>("loading");
  const [error, setError] = useState<string | null>(null);
  const [storage, setStorage] = useState<CalendarStorage>("browser");
  const [storageReason, setStorageReason] = useState<StorageReason>("signed-out");

  const storeRef = useRef<CalendarStore | null>(null);
  // Ignore results from a resolution that a newer one (e.g. sign-in/out) superseded.
  const generation = useRef(0);

  const resolve = useCallback(async () => {
    const gen = ++generation.current;
    storeRef.current = null;
    setStatus("loading");
    setError(null);
    const result = await resolveCalendarStore({ userId, client: () => supabase }).catch(
      (err: unknown) =>
        ({
          ok: false,
          storage: userId ? "cloud" : "browser",
          reason: userId ? "cloud" : "signed-out",
          error: message(err, "Couldn't load your calendar."),
        }) as const,
    );
    if (gen !== generation.current) return;
    if (result.ok) {
      storeRef.current = result.store;
      setEvents(result.events);
      setStorage(result.store.kind);
      setStorageReason(result.reason);
      setStatus("ready");
    } else {
      setEvents([]);
      setStorage(result.storage);
      setStorageReason(result.reason);
      setError(result.error);
      setStatus("error");
    }
  }, [userId]);

  useEffect(() => {
    if (!ready) return;
    void resolve();
  }, [ready, resolve]);

  // Keep browser-stored entries in sync across tabs.
  useEffect(() => {
    if (typeof window === "undefined" || storage !== "browser" || status !== "ready") return;
    const onStorage = (e: StorageEvent) => {
      if (e.key !== BROWSER_STORAGE_KEY || !storeRef.current) return;
      const store = storeRef.current;
      void store.list().then((list) => {
        if (storeRef.current === store) setEvents(list);
      });
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, [storage, status]);

  const refresh = useCallback(async () => {
    const store = storeRef.current;
    if (!store) {
      if (ready) await resolve();
      return;
    }
    try {
      const list = await store.list();
      if (storeRef.current !== store) return;
      setEvents(list);
      setError(null);
      setStatus("ready");
    } catch (err) {
      if (storeRef.current !== store) return;
      setError(message(err, "Couldn't load your calendar."));
      setStatus("error");
    }
  }, [ready, resolve]);

  const create = useCallback(async (input: CareEventInput): Promise<MutationResult> => {
    const store = storeRef.current;
    if (!store) return NOT_READY;
    try {
      const created = await store.create(input);
      if (storeRef.current === store) setEvents((list) => sortByStart([...list, created]));
      return { ok: true };
    } catch (err) {
      return { ok: false, error: message(err, "Couldn't save this entry.") };
    }
  }, []);

  const update = useCallback(async (id: string, input: CareEventInput): Promise<MutationResult> => {
    const store = storeRef.current;
    if (!store) return NOT_READY;
    try {
      const updated = await store.update(id, input);
      if (storeRef.current === store) {
        setEvents((list) => sortByStart(list.map((e) => (e.id === id ? updated : e))));
      }
      return { ok: true };
    } catch (err) {
      return { ok: false, error: message(err, "Couldn't update this entry.") };
    }
  }, []);

  const remove = useCallback(async (id: string): Promise<MutationResult> => {
    const store = storeRef.current;
    if (!store) return NOT_READY;
    try {
      await store.remove(id);
      if (storeRef.current === store) setEvents((list) => list.filter((e) => e.id !== id));
      return { ok: true };
    } catch (err) {
      return { ok: false, error: message(err, "Couldn't delete this entry.") };
    }
  }, []);

  return { events, status, error, storage, storageReason, create, update, remove, refresh };
}
