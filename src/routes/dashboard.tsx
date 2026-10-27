import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowUpRight } from "lucide-react";
import { PageHeader, SyntheticBadge, navItems } from "@/components/app-shell";
import { CareOverview } from "@/components/care-overview";
import { exampleInstructions, syntheticActivity, syntheticTestCases } from "@/lib/synthetic-data";
import { useReviewSession } from "@/lib/review-session";
import { formatTaskType } from "@/lib/review-state";
import { useAuth } from "@/lib/auth";
import { pageMeta } from "@/lib/seo";

export const Route = createFileRoute("/dashboard")({
  head: () =>
    pageMeta(
      "Overview",
      "Your upcoming care entries, nearby care, a mindful break, and the instruction review queue.",
    ),
  component: Dashboard,
});

const blurbs: Record<string, string> = {
  "/instructions": "Turn instruction text into reviewable tasks.",
  "/evidence": "Trace every task back to its sentence.",
  "/visual-check": "Capture or upload an image for checking.",
  "/reliability": "Run test cases and read live metrics.",
  "/privacy": "How data is handled, and the limits.",
};

function Dashboard() {
  const { user } = useAuth();
  const { snapshot, counts, phase } = useReviewSession();
  const hasSession = phase === "ready";
  const exampleTitle =
    exampleInstructions.find((e) => e.id === snapshot.exampleId)?.title ??
    (snapshot.source.trim() ? "Current document" : null);

  return (
    <>
      <PageHeader
        eyebrow={user ? `Signed in · ${user.email}` : "Overview"}
        title={user ? "Welcome back" : "Welcome to Clarity Health"}
        description="Find care nearby, keep your next steps organised, and take a moment for yourself when you need it."
      />

      <CareOverview />

      <div className="mb-8 mt-20 flex flex-wrap items-center gap-3">
        <h2 className="font-display text-4xl">Today’s review queue</h2>
        <SyntheticBadge />
        <span className="h-px flex-1 bg-border" />
      </div>
      <p className="-mt-4 mb-8 max-w-2xl text-sm text-muted-foreground">
        Counts reflect the latest analysis in this browser session. Synthetic examples only — no
        patient content is stored.
      </p>

      {!hasSession ? (
        <section aria-label="Empty review queue" className="rule-top animate-rise py-10">
          <div className="eyebrow">Pending reviews</div>
          <div className="display-num mt-3 text-[5.5rem]">0</div>
          <p className="mt-2 max-w-md text-sm text-muted-foreground">
            No analysis in application state yet. Open the Instruction Studio, pick a fictional
            example, and run the extraction engine.
          </p>
          <Link
            to="/instructions"
            className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-accent-foreground hover:underline underline-offset-4"
          >
            Open Instruction Studio <ArrowUpRight className="h-4 w-4" />
          </Link>
        </section>
      ) : (
        <section
          aria-label="Summary"
          className="grid gap-x-10 gap-y-8 animate-rise md:grid-cols-[1.4fr_1fr_1fr_1fr]"
        >
          <div className="rule-top">
            <div className="eyebrow">Pending reviews</div>
            <div className="display-num mt-3 text-[5.5rem]">{counts.pending}</div>
            <p className="mt-2 text-sm text-muted-foreground">
              of {counts.total} candidate task{counts.total === 1 ? "" : "s"} still awaiting accept,
              edit, or reject
              {exampleTitle ? ` · ${exampleTitle}` : ""}.
            </p>
            <Link
              to="/instructions"
              className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-accent-foreground hover:underline underline-offset-4"
            >
              Continue review <ArrowUpRight className="h-4 w-4" />
            </Link>
          </div>
          <div className="rule-top">
            <div className="eyebrow">Flagged for clarity</div>
            <div className="display-num mt-3 text-warning-foreground">{counts.flagged}</div>
            <p className="mt-2 text-sm text-muted-foreground">
              candidates with ambiguity or integrity warnings
            </p>
          </div>
          <div className="rule-top">
            <div className="eyebrow">Reviewed</div>
            <div className="display-num mt-3">
              {counts.accepted + counts.edited + counts.rejected}
            </div>
            <p className="mt-2 text-sm text-muted-foreground">
              {counts.accepted} accepted · {counts.edited} edited · {counts.rejected} rejected
            </p>
          </div>
          <div className="rule-top">
            <div className="eyebrow">Task mix</div>
            {counts.byType.length === 0 ? (
              <p className="mt-3 text-sm text-muted-foreground">No typed candidates.</p>
            ) : (
              <ul className="mt-3 space-y-2">
                {counts.byType.map(({ type, n }) => (
                  <li key={type} className="text-sm">
                    <div className="flex justify-between">
                      <span className="capitalize">{formatTaskType(type)}</span>
                      <span className="font-mono text-xs">{n}</span>
                    </div>
                    <div className="mt-1 h-1 bg-muted">
                      <div
                        className="h-1 bg-primary"
                        style={{ width: `${counts.total ? (n / counts.total) * 100 : 0}%` }}
                      />
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>
      )}

      <div className="mt-16 grid gap-12 lg:grid-cols-[1.6fr_1fr]">
        <section>
          <h2 className="font-display text-3xl">Instructions in the queue</h2>
          {!hasSession ? (
            <p className="mt-5 text-sm text-muted-foreground">
              Queue rows appear after you run analysis. Bundled fictional examples live in the
              studio.
            </p>
          ) : (
            <table className="mt-5 w-full text-sm">
              <thead>
                <tr className="border-b border-foreground text-left">
                  <th className="eyebrow py-2 font-normal">Instruction</th>
                  <th className="eyebrow py-2 text-right font-normal">Tasks</th>
                  <th className="eyebrow py-2 text-right font-normal">Pending</th>
                  <th className="eyebrow py-2 text-right font-normal">Flags</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b">
                  <td className="py-3.5 pr-4">{exampleTitle ?? "Current document"}</td>
                  <td className="py-3.5 text-right font-mono">{counts.total}</td>
                  <td className="py-3.5 text-right font-mono">{counts.pending}</td>
                  <td className="py-3.5 text-right font-mono text-warning-foreground">
                    {counts.flagged}
                  </td>
                </tr>
              </tbody>
            </table>
          )}

          <p className="mt-4 text-xs text-muted-foreground">
            Reliability lab still has {syntheticTestCases.length} synthetic classification cases.
          </p>

          <h2 className="mt-14 font-display text-3xl">Instruction tools</h2>
          <ul className="mt-5 grid border-t sm:grid-cols-2">
            {navItems.map(({ to, label, num }) => (
              <li key={to} className="border-b sm:odd:border-r">
                <Link
                  to={to}
                  className="group flex items-start gap-4 p-5 transition-colors hover:bg-card"
                >
                  <span className="font-mono text-xs text-primary">{num}</span>
                  <span className="flex-1">
                    <span className="block font-medium">{label}</span>
                    <span className="mt-1 block text-sm text-muted-foreground">{blurbs[to]}</span>
                  </span>
                  <ArrowUpRight
                    className="h-4 w-4 text-muted-foreground transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-primary"
                    aria-hidden
                  />
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
            {hasSession && (
              <li className="relative pb-6 pl-6">
                <span className="absolute -left-[5px] top-1.5 h-2.5 w-2.5 rounded-full border-2 border-background bg-primary" />
                <div className="text-sm">
                  Engine run: {counts.total} candidates · {counts.pending} pending
                  {exampleTitle ? ` · ${exampleTitle}` : ""}
                </div>
                <div className="eyebrow mt-1">instructions · this session</div>
              </li>
            )}
            {syntheticActivity.map((a) => (
              <li key={a.id} className="relative pb-6 pl-6">
                <span className="absolute -left-[5px] top-1.5 h-2.5 w-2.5 rounded-full border-2 border-background bg-primary" />
                <div className="text-sm">{a.label}</div>
                <div className="eyebrow mt-1">
                  {a.area} · {a.when}
                </div>
              </li>
            ))}
          </ol>
          <p className="text-xs text-muted-foreground">
            Session activity is derived from application state; older rows are sample layout
            entries.
          </p>
        </section>
      </div>
    </>
  );
}
