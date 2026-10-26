import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/app-shell";
import { pageMeta } from "@/lib/seo";

export const Route = createFileRoute("/privacy")({
  head: () => pageMeta("Privacy", "How Clarity Health handles data, its limitations and synthetic evaluation."),
  component: Privacy,
});

const sections = [
  {
    title: "Data handling",
    body: [
      "This interface preview has no backend. Text you type, images you capture or upload, and locations you add stay in your browser tab and disappear when you leave or refresh.",
      "Nothing is sent to an AI service, analytics provider or third party. Map links open an external map site only when you select them.",
      "Do not enter real patient information while the platform is in development.",
    ],
  },
  {
    title: "Limitations",
    body: [
      "Task drafts come from a simple placeholder rule set, not the extraction engine. They can miss or misread instructions.",
      "Clarity Health has not been clinically validated and is not a medical device. It does not replace review by a qualified clinician.",
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
      <PageHeader eyebrow="06 · Trust" title="Privacy & limitations" />
      <div className="max-w-3xl space-y-6">
        {sections.map((s) => (
          <section key={s.title} className="surface p-6">
            <h2 className="font-display text-2xl">{s.title}</h2>
            <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-relaxed text-muted-foreground">
              {s.body.map((b) => <li key={b}>{b}</li>)}
            </ul>
          </section>
        ))}
      </div>
    </>
  );
}
