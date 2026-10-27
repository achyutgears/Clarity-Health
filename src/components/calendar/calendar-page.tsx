import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, Plus, RefreshCw } from "lucide-react";
import { Notice, PageHeader } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/lib/auth";
import {
  formatRangeTitle,
  isSameDay,
  parseDateKey,
  shiftAnchor,
  toDateKey,
  useCalendar,
  type CalendarView,
  type CareEvent,
} from "@/lib/calendar";
import { AgendaView } from "./agenda-view";
import { DeleteEventDialog } from "./delete-event-dialog";
import { EventFormDialog, type EventFormMode } from "./event-form-dialog";
import { REMINDER_HONESTY, storageLabelFor } from "./kind-meta";
import { MonthView } from "./month-view";
import { DayPanel, UpcomingPanel } from "./side-panels";
import { StorageNotice } from "./storage-notice";
import { WeekView } from "./week-view";

const VIEWS: Array<{ value: CalendarView; label: string; unit: string }> = [
  { value: "month", label: "Month", unit: "month" },
  { value: "week", label: "Week", unit: "week" },
  { value: "agenda", label: "Agenda", unit: "week" },
];

const isView = (v: string): v is CalendarView => VIEWS.some((x) => x.value === v);

export function CalendarPage() {
  const cal = useCalendar();
  const { requireAuth } = useAuth();

  // "Now" only exists on the client, so server and first client render match (no hydration drift).
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    setNow(new Date());
    const t = window.setInterval(() => setNow(new Date()), 60_000);
    return () => window.clearInterval(t);
  }, []);

  const [view, setView] = useState<CalendarView>("month");
  const [anchor, setAnchor] = useState<Date | null>(null);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [form, setForm] = useState<EventFormMode | null>(null);
  const [pendingDelete, setPendingDelete] = useState<CareEvent | null>(null);

  useEffect(() => {
    if (now && !anchor) {
      setAnchor(now);
      setSelectedKey(toDateKey(now));
    }
  }, [now, anchor]);

  const ready = cal.status === "ready";
  const viewMeta = VIEWS.find((v) => v.value === view) ?? {
    value: view,
    label: "Month",
    unit: "month",
  };
  const selectedDate = selectedKey ? parseDateKey(selectedKey) : null;

  const selectDay = (date: Date) => {
    setSelectedKey(toDateKey(date));
    setAnchor(date);
  };
  const goToday = () => {
    const today = new Date();
    setNow(today);
    selectDay(today);
  };
  const openCreate = (dateKey?: string) =>
    setForm({ type: "create", dateKey: dateKey ?? selectedKey ?? toDateKey(new Date()) });
  const openEdit = (event: CareEvent) => setForm({ type: "edit", event });

  const loadingLabel =
    cal.status === "loading"
      ? "Loading your calendar…"
      : cal.status === "error"
        ? "Your calendar couldn't be loaded."
        : `Calendar loaded with ${cal.events.length} ${cal.events.length === 1 ? "entry" : "entries"}.`;

  return (
    <>
      <PageHeader
        eyebrow="Care · Calendar"
        title="My Care Calendar"
        description="Keep track of appointments, health tasks, and reminders you add yourself. Every entry is a personal note — Clarity Health doesn't book or confirm visits."
        actions={
          <Button className="h-11" onClick={() => openCreate()} disabled={!ready || !now}>
            <Plus aria-hidden="true" /> Add entry
          </Button>
        }
      />

      <p className="sr-only" aria-live="polite">
        {loadingLabel}
      </p>

      <div className="mb-8 space-y-3">
        {cal.status !== "loading" && cal.status !== "error" && (
          <StorageNotice
            reason={cal.storageReason}
            onSignIn={() => requireAuth("Sign in to keep your calendar in your account.")}
          />
        )}
        <p className="text-xs leading-relaxed text-muted-foreground">{REMINDER_HONESTY}</p>
      </div>

      {cal.status === "error" && (
        <div className="mb-8">
          <Notice tone="warning">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <span role="alert">
                Couldn&apos;t load your calendar: {cal.error ?? "Unknown error."} Nothing has been
                changed.
              </span>
              <Button variant="outline" className="h-10 bg-card" onClick={() => void cal.refresh()}>
                <RefreshCw aria-hidden="true" /> Try again
              </Button>
            </div>
          </Notice>
        </div>
      )}

      {!now || !anchor || cal.status === "loading" ? (
        <CalendarSkeleton />
      ) : (
        <div className="grid gap-10 xl:grid-cols-[minmax(0,1fr)_20rem]">
          <Tabs
            value={view}
            onValueChange={(v) => isView(v) && setView(v)}
            className="min-w-0 motion-safe:animate-rise"
          >
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div className="flex min-w-0 flex-wrap items-center gap-2">
                <Button variant="outline" className="h-10" onClick={goToday}>
                  Today
                </Button>
                <div className="flex">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-10 w-10"
                    aria-label={`Previous ${viewMeta.unit}`}
                    onClick={() => setAnchor((a) => shiftAnchor(view, a ?? now, -1))}
                  >
                    <ChevronLeft />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-10 w-10"
                    aria-label={`Next ${viewMeta.unit}`}
                    onClick={() => setAnchor((a) => shiftAnchor(view, a ?? now, 1))}
                  >
                    <ChevronRight />
                  </Button>
                </div>
                <h2 className="font-display text-2xl leading-tight sm:text-3xl" aria-live="polite">
                  {formatRangeTitle(view, anchor)}
                </h2>
              </div>
              <TabsList aria-label="Calendar view" className="h-11 w-full sm:w-auto">
                {VIEWS.map((v) => (
                  <TabsTrigger
                    key={v.value}
                    value={v.value}
                    className="h-9 flex-1 px-4 sm:flex-none"
                  >
                    {v.label}
                  </TabsTrigger>
                ))}
              </TabsList>
            </div>

            <TabsContent value="month" className="mt-0">
              <MonthView
                anchor={anchor}
                today={now}
                selectedKey={selectedKey}
                events={cal.events}
                onSelectDay={selectDay}
              />
              {cal.status === "ready" && cal.events.length === 0 && (
                <p className="mt-4 text-sm text-muted-foreground">
                  Your calendar is empty. Choose a day, then “Add entry” to track an appointment,
                  health task, or medication reminder.
                </p>
              )}
            </TabsContent>
            <TabsContent value="week" className="mt-0">
              <WeekView
                anchor={anchor}
                today={now}
                selectedKey={selectedKey}
                events={cal.events}
                disabled={!ready}
                onSelectDay={selectDay}
                onOpenEvent={openEdit}
                onAdd={(key) => {
                  setSelectedKey(key);
                  openCreate(key);
                }}
              />
            </TabsContent>
            <TabsContent value="agenda" className="mt-0">
              <AgendaView
                anchor={anchor}
                now={now}
                events={cal.events}
                disabled={!ready}
                onEdit={openEdit}
                onDelete={setPendingDelete}
              />
            </TabsContent>
          </Tabs>

          <aside className="min-w-0 space-y-10" aria-label="Selected day and upcoming entries">
            {selectedDate && selectedKey && (
              <DayPanel
                date={selectedDate}
                dateKey={selectedKey}
                now={now}
                events={cal.events}
                disabled={!ready}
                onAdd={openCreate}
                onEdit={openEdit}
                onDelete={setPendingDelete}
              />
            )}
            <UpcomingPanel
              now={now}
              events={cal.events}
              onSelect={(e) => {
                const d = new Date(e.startsAt);
                if (!selectedDate || !isSameDay(d, selectedDate)) selectDay(d);
              }}
            />
          </aside>
        </div>
      )}

      <EventFormDialog
        mode={form}
        onClose={() => setForm(null)}
        storageLabel={storageLabelFor(cal.storageReason)}
        onSubmit={(input) =>
          form?.type === "edit" ? cal.update(form.event.id, input) : cal.create(input)
        }
      />
      <DeleteEventDialog
        event={pendingDelete}
        onClose={() => setPendingDelete(null)}
        onConfirm={cal.remove}
      />
    </>
  );
}

function CalendarSkeleton() {
  return (
    <div aria-busy="true" className="grid gap-10 xl:grid-cols-[minmax(0,1fr)_20rem]">
      <div>
        <div className="mb-4 h-11 w-64 max-w-full animate-pulse rounded-md bg-muted motion-reduce:animate-none" />
        <div className="grid grid-cols-7 gap-px overflow-hidden rounded-lg border border-border bg-border">
          {Array.from({ length: 42 }, (_, i) => (
            <div key={i} className="h-[3.25rem] bg-card sm:h-[6.5rem]" />
          ))}
        </div>
      </div>
      <div className="space-y-4">
        <div className="h-8 w-40 animate-pulse rounded bg-muted motion-reduce:animate-none" />
        <div className="h-24 animate-pulse rounded-lg bg-muted motion-reduce:animate-none" />
      </div>
    </div>
  );
}
