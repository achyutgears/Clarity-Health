import { createFileRoute } from "@tanstack/react-router";
import { CalendarPage } from "@/components/calendar/calendar-page";
import { pageMeta } from "@/lib/seo";

export const Route = createFileRoute("/calendar")({
  head: () =>
    pageMeta(
      "My Care Calendar",
      "Track appointments, health tasks, and reminders you add yourself — personal entries, not bookings.",
    ),
  component: CalendarPage,
});
