import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Play, RotateCcw } from "lucide-react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis, Legend } from "recharts";
import { PageHeader, Notice, SyntheticBadge } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { syntheticTestCases } from "@/lib/synthetic-data";
import { classifySentence, computeMetrics, LABELS, type EvalResult } from "@/lib/instruction-logic";
import { pageMeta } from "@/lib/seo";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/reliability")({
  head: () => pageMeta("Reliability Lab", "Run synthetic test cases and inspect metrics, confusion matrix and failures."),
  component: Reliability,
});

const pct = (v: number | null) => (v === null ? "—" : `${Math.round(v * 100)}%`);

function Reliability() {
  const [results, setResults] = useState<EvalResult[] | null>(null);
  const run = () =>
    setResults(syntheticTestCases.map((c) => {
      const predicted = classifySentence(c.sentence);
      return { id: c.id, expected: c.expected, predicted, pass: predicted === c.expected };
    }));
  const m = results ? computeMetrics(results) : null;
  const byId = new Map(results?.map((r) => [r.id, r]));
  const maxCell = m ? Math.max(1, ...m.matrix.flat()) : 1;

  return (
    <>
      <PageHeader
        eyebrow="Evaluation"
        title="Reliability Lab"
        description="Runs synthetic cases against the placeholder rule baseline. Metrics are computed live from each run."
        actions={
          <div className="flex items-center gap-2">
            <SyntheticBadge />
            <Button onClick={run}><Play className="h-4 w-4" /> Run tests</Button>
            <Button variant="outline" onClick={() => setResults(null)} disabled={!results}><RotateCcw className="h-4 w-4" /> Reset</Button>
          </div>
        }
      />
      <Notice tone="warning">These results describe a keyword baseline on fabricated sentences. They are not evidence of clinical accuracy.</Notice>

      <section aria-label="Metrics" className="mt-6 grid grid-cols-2 gap-4 md:grid-cols-4">
        {[
          ["Cases", m ? m.total : syntheticTestCases.length],
          ["Passed", m ? m.passed : "—"],
          ["Failed", m ? m.failed : "—"],
          ["Pass rate", m ? pct(m.total ? m.passed / m.total : null) : "—"],
        ].map(([l, v]) => (
          <div key={l} className="surface p-5"><div className="eyebrow">{l}</div><div className="mt-2 font-display text-3xl">{v}</div></div>
        ))}
      </section>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <section className="surface p-5">
          <h2 className="font-display text-xl">Confusion matrix</h2>
          {!m ? <p className="mt-3 text-sm text-muted-foreground">Run tests to populate.</p> : (
            <table className="mt-4 w-full text-center text-sm">
              <caption className="eyebrow mb-2 text-left">Rows: expected · Columns: predicted</caption>
              <thead><tr><th />{LABELS.map((l) => <th key={l} className="eyebrow p-2">{l}</th>)}</tr></thead>
              <tbody>
                {m.matrix.map((row, i) => (
                  <tr key={LABELS[i]}>
                    <th className="eyebrow p-2 text-left">{LABELS[i]}</th>
                    {row.map((v, j) => (
                      <td key={j} className="p-1">
                        <div
                          className={cn("rounded py-3 font-mono", i === j ? "bg-primary text-primary-foreground" : v ? "bg-warning-soft text-warning-foreground" : "bg-muted")}
                          style={{ opacity: v ? 0.45 + 0.55 * (v / maxCell) : 1 }}
                        >{v}</div>
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
        <section className="surface p-5">
          <h2 className="font-display text-xl">Precision & recall by label</h2>
          {!m ? <p className="mt-3 text-sm text-muted-foreground">Run tests to populate.</p> : (
            <div className="mt-4 h-64">
              <ResponsiveContainer>
                <BarChart data={m.perLabel.map((p) => ({ label: p.label, precision: (p.precision ?? 0) * 100, recall: (p.recall ?? 0) * 100 }))}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="label" fontSize={11} />
                  <YAxis domain={[0, 100]} fontSize={11} unit="%" />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="precision" fill="var(--chart-1)" radius={[3, 3, 0, 0]} />
                  <Bar dataKey="recall" fill="var(--chart-2)" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </section>
      </div>

      <section className="surface mt-6 overflow-x-auto">
        <table className="w-full text-sm">
          <caption className="p-5 text-left font-display text-xl">Test cases</caption>
          <thead className="border-y bg-muted/50">
            <tr>{["ID", "Sentence", "Expected", "Predicted", "Result"].map((h) => <th key={h} className="eyebrow px-4 py-2 text-left">{h}</th>)}</tr>
          </thead>
          <tbody className="divide-y">
            {syntheticTestCases.map((c) => {
              const r = byId.get(c.id);
              return (
                <tr key={c.id}>
                  <td className="px-4 py-2 font-mono text-xs">{c.id}</td>
                  <td className="px-4 py-2">{c.sentence}</td>
                  <td className="px-4 py-2 font-mono text-xs">{c.expected}</td>
                  <td className="px-4 py-2 font-mono text-xs">{r?.predicted ?? "—"}</td>
                  <td className={cn("px-4 py-2 text-xs font-medium", r?.pass && "text-success", r && !r.pass && "text-destructive")}>{r ? (r.pass ? "Pass" : "Fail") : "Not run"}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </section>

      {results && (
        <section className="surface mt-6 p-5">
          <h2 className="font-display text-xl">Failure analysis</h2>
          {results.every((r) => r.pass) ? <p className="mt-3 text-sm text-muted-foreground">No failures in this run.</p> : (
            <ul className="mt-3 space-y-2">
              {results.filter((r) => !r.pass).map((r) => (
                <li key={r.id} className="rounded-md bg-warning-soft p-3 text-sm text-warning-foreground">
                  <span className="font-mono">{r.id}</span>: expected <b>{r.expected}</b>, got <b>{r.predicted}</b> — “{syntheticTestCases.find((c) => c.id === r.id)?.sentence}”
                </li>
              ))}
            </ul>
          )}
        </section>
      )}
    </>
  );
}
