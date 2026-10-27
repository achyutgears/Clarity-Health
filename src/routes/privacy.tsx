import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/app-shell";
import { pageMeta } from "@/lib/seo";

export const Route = createFileRoute("/privacy")({
  head: () =>
    pageMeta(
      "Privacy",
      "How Clarity Health handles data, its limitations and synthetic evaluation.",
    ),
  component: Privacy,
});

const sections = [
  {
    title: "Data handling",
    body: [
      "Accounts use email and password (or Google, once enabled) through the project's Supabase authentication. Instructions you save and calendar entries synced to your account are stored in its database, where row-level security limits each row to its owner.",
      "When you are signed out, or before account sync for the calendar is set up, calendar entries are saved only in this browser's local storage. You can edit or delete them at any time.",
      "Find Care asks for your location only when you select “Use my location”. The coordinates are rounded to about 100 metres and sent to the map data service (OpenStreetMap, or Google Places if configured) to look up nearby facilities. They are not stored.",
      "Instruction Studio text, Visual Check images, places you add by hand, and Mindful Moments activities stay in your browser tab. Nothing is sent to an AI service or analytics provider.",
      "Do not enter real patient information while the platform is in development.",
    ],
  },
  {
    title: "Limitations",
    body: [
      "Task drafts come from a deterministic rule engine, not a language model. They can miss or misread instructions.",
      "Clarity Health has not been clinically validated and is not a medical device. It does not replace review by a qualified clinician.",
      "Find Care results come from public map data, which may be incomplete or out of date. They are not recommendations; call ahead to confirm hours and services. In an emergency, call your local emergency number.",
      "Calendar entries are personal notes, not bookings with a clinic. Reminders appear inside the app only; no push or email notifications are sent.",
      "Mindful Moments activities are for relaxation only. They are not a treatment and do not measure health.",
      "Visual Check does not analyze images until an analysis service is connected.",
    ],
  },
  {
    title: "Synthetic evaluation approach",
    body: [
      "All examples and test cases are fabricated and clearly labeled as synthetic.",
      "Reliability metrics are calculated from each run against those cases. No scores are hardcoded.",
      "Synthetic results show how the system behaves on constructed examples. They are not evidence of real-world performance.",
    ],
  },
];

function Privacy() {
  return (
    <>
      <PageHeader eyebrow="05 · Trust" title="Privacy & limitations" />
      <div className="max-w-3xl space-y-6">
        {sections.map((s) => (
          <section key={s.title} className="surface p-6">
            <h2 className="font-display text-2xl">{s.title}</h2>
            <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-relaxed text-muted-foreground">
              {s.body.map((b) => (
                <li key={b}>{b}</li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </>
  );
}
