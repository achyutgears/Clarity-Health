import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import { PageHeader, SyntheticBadge, navItems } from "@/components/app-shell";
import { exampleInstructions, syntheticActivity, syntheticTestCases } from "@/lib/synthetic-data";
import { draftTasks, splitSentences } from "@/lib/instruction-logic";
import { pageMeta } from "@/lib/seo";

export const Route = createFileRoute("/dashboard")({
  head: () => pageMeta("Dashboard", "Overview of instruction tasks, pending reviews and recent activity."),
  component: Dashboard,
});

function Dashboard() {
  const tasks = exampleInstructions.flatMap((e) => draftTasks(splitSentences(e.text)));
  const flagged = tasks.filter((t) => t.warnings.length).length;
  const counts = [
    { label: "Example instructions", value: exampleInstructions.length },
    { label: "Draft tasks", value: tasks.length },
    { label: "Pending reviews", value: tasks.filter((t) => t.status === "pending").length },
    { label: "Tasks with warnings", value: flagged, warn: true },
    { label: "Reliability test cases", value: syntheticTestCases.length },
  ];

  return (
    <>
      <PageHeader
        eyebrow="Workspace"
        title="Dashboard"
        description="Counts are derived from the bundled synthetic examples. No real patient content is stored."
        actions={<SyntheticBadge />}
      />
      <section aria-label="Task counts" className="grid grid-cols-2 gap-4 md:grid-cols-5">
        {counts.map((c) => (
          <div key={c.label} className="surface p-5">
            <div className="eyebrow">{c.label}</div>
            <div className={`mt-2 font-display text-4xl ${c.warn ? "text-warning-foreground" : ""}`}>{c.value}</div>
          </div>
        ))}
      </section>

      <div className="mt-8 grid gap-6 lg:grid-cols-3">
        <section className="surface p-6 lg:col-span-2">
          <h2 className="font-display text-xl">Features</h2>
          <ul className="mt-4 grid gap-3 sm:grid-cols-2">
            {navItems.filter((n) => n.to !== "/dashboard").map(({ to, label, icon: Icon }) => (
              <li key={to}>
                <Link to={to} className="group flex items-center gap-3 rounded-md border p-4 transition-colors hover:border-primary/40 hover:bg-teal-soft">
                  <Icon className="h-5 w-5 text-primary" aria-hidden />
                  <span className="flex-1 text-sm font-medium">{label}</span>
                  <ArrowRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" aria-hidden />
                </Link>
              </li>
            ))}
          </ul>
        </section>
        <section className="surface p-6">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-xl">Recent activity</h2>
            <SyntheticBadge />
          </div>
          <ul className="mt-4 divide-y">
            {syntheticActivity.map((a) => (
              <li key={a.id} className="py-3">
                <div className="text-sm">{a.label}</div>
                <div className="eyebrow mt-1">{a.area} · {a.when}</div>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </>
  );
}
