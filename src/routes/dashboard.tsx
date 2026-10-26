import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowUpRight } from "lucide-react";
import { PageHeader, SyntheticBadge, navItems } from "@/components/app-shell";
import { exampleInstructions, syntheticActivity, syntheticTestCases } from "@/lib/synthetic-data";
import { draftTasks, LABELS, splitSentences } from "@/lib/instruction-logic";
import { useAuth } from "@/lib/auth";
import { pageMeta } from "@/lib/seo";

export const Route = createFileRoute("/dashboard")({
  head: () => pageMeta("Overview", "Overview of instruction tasks, pending reviews and recent activity."),
  component: Dashboard,
});

const blurbs: Record<string, string> = {
  "/instructions": "Turn instruction text into reviewable tasks.",
  "/evidence": "Trace every task back to its sentence.",
  "/visual-check": "Capture or upload an image for checking.",
  "/reliability": "Run test cases and read live metrics.",
  "/locations": "Verified places with map directions.",
  "/privacy": "How data is handled, and the limits.",
};

function Dashboard() {
  const { user } = useAuth();
  const perExample = exampleInstructions.map((e) => ({ ex: e, tasks: draftTasks(splitSentences(e.text)) }));
  const tasks = perExample.flatMap((p) => p.tasks);
  const flagged = tasks.filter((t) => t.warnings.length).length;
  const byLabel = LABELS.map((l) => ({ l, n: tasks.filter((t) => t.label === l).length }));

  return (
    <>
      <PageHeader
        eyebrow={user ? `Signed in · ${user.email}` : "Overview"}
        title="Today’s review queue"
        description="Every figure here is derived from the bundled synthetic examples. No patient content is stored."
        actions={<SyntheticBadge />}
      />

      <section aria-label="Summary" className="grid gap-x-10 gap-y-8 animate-rise md:grid-cols-[1.4fr_1fr_1fr_1fr]">
        <div className="rule-top">
          <div className="eyebrow">Pending reviews</div>
          <div className="display-num mt-3 text-[5.5rem]">{tasks.length}</div>
          <p className="mt-2 text-sm text-muted-foreground">draft tasks across {exampleInstructions.length} example instructions awaiting accept, edit or reject.</p>
          <Link to="/instructions" className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-accent-foreground hover:underline underline-offset-4">
            Open Instruction Studio <ArrowUpRight className="h-4 w-4" />
          </Link>
        </div>
        <div className="rule-top">
          <div className="eyebrow">Flagged for clarity</div>
          <div className="display-num mt-3 text-warning-foreground">{flagged}</div>
          <p className="mt-2 text-sm text-muted-foreground">tasks with vague or conditional wording</p>
        </div>
        <div className="rule-top">
          <div className="eyebrow">Test cases</div>
          <div className="display-num mt-3">{syntheticTestCases.length}</div>
          <p className="mt-2 text-sm text-muted-foreground">ready to run in the Reliability Lab</p>
        </div>
        <div className="rule-top">
          <div className="eyebrow">Task mix</div>
          <ul className="mt-3 space-y-2">
            {byLabel.map(({ l, n }) => (
              <li key={l} className="text-sm">
                <div className="flex justify-between"><span className="capitalize">{l}</span><span className="font-mono text-xs">{n}</span></div>
                <div className="mt-1 h-1 bg-muted"><div className="h-1 bg-primary" style={{ width: `${tasks.length ? (n / tasks.length) * 100 : 0}%` }} /></div>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <div className="mt-16 grid gap-12 lg:grid-cols-[1.6fr_1fr]">
        <section>
          <h2 className="font-display text-3xl">Instructions in the queue</h2>
          <table className="mt-5 w-full text-sm">
            <thead>
              <tr className="border-b border-foreground text-left">
                <th className="eyebrow py-2 font-normal">Instruction</th>
                <th className="eyebrow py-2 text-right font-normal">Tasks</th>
                <th className="eyebrow py-2 text-right font-normal">Flags</th>
              </tr>
            </thead>
            <tbody>
              {perExample.map(({ ex, tasks }) => (
                <tr key={ex.id} className="border-b">
                  <td className="py-3.5 pr-4">{ex.title}</td>
                  <td className="py-3.5 text-right font-mono">{tasks.length}</td>
                  <td className="py-3.5 text-right font-mono text-warning-foreground">{tasks.filter((t) => t.warnings.length).length}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <h2 className="mt-14 font-display text-3xl">Workspace</h2>
          <ul className="mt-5 grid border-t sm:grid-cols-2">
            {navItems.filter((n) => n.to !== "/dashboard").map(({ to, label, num }) => (
              <li key={to} className="border-b sm:odd:border-r">
                <Link to={to} className="group flex items-start gap-4 p-5 transition-colors hover:bg-card">
                  <span className="font-mono text-xs text-primary">{num}</span>
                  <span className="flex-1">
                    <span className="block font-medium">{label}</span>
                    <span className="mt-1 block text-sm text-muted-foreground">{blurbs[to]}</span>
                  </span>
                  <ArrowUpRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-primary" aria-hidden />
                </Link>
              </li>
            ))}
          </ul>
        </section>

        <section>
          <div className="flex items-center justify-between">
            <h2 className="font-display text-3xl">Recent activity</h2>
          </div>
          <ol className="mt-5 border-l border-border">
            {syntheticActivity.map((a) => (
              <li key={a.id} className="relative pb-6 pl-6">
                <span className="absolute -left-[5px] top-1.5 h-2.5 w-2.5 rounded-full border-2 border-background bg-primary" />
                <div className="text-sm">{a.label}</div>
                <div className="eyebrow mt-1">{a.area} · {a.when}</div>
              </li>
            ))}
          </ol>
          <p className="text-xs text-muted-foreground">Sample entries shown for layout. Real activity logging is not yet connected.</p>
        </section>
      </div>
    </>
  );
}
