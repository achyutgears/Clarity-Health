import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { AlertTriangle, Check, Pencil, X, Play } from "lucide-react";
import { toast } from "sonner";
import { PageHeader, Notice, SyntheticBadge } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { exampleInstructions } from "@/lib/synthetic-data";
import { draftTasks, splitSentences, type DraftTask, type SourceSentence } from "@/lib/instruction-logic";
import { pageMeta } from "@/lib/seo";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/instructions")({
  head: () => pageMeta("Instruction Studio", "Break healthcare instructions into reviewable tasks with source evidence."),
  component: Studio,
});

function Studio() {
  const [text, setText] = useState(exampleInstructions[0].text);
  const [sentences, setSentences] = useState<SourceSentence[]>([]);
  const [tasks, setTasks] = useState<DraftTask[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState("");

  const analyze = () => {
    const s = splitSentences(text);
    setSentences(s);
    setTasks(draftTasks(s));
    setSelected(null);
    toast.success(`Segmented into ${s.length} sentences (rule-based preview)`);
  };
  const update = (id: string, patch: Partial<DraftTask>) =>
    setTasks((ts) => ts.map((t) => (t.id === id ? { ...t, ...patch } : t)));

  const selTask = tasks.find((t) => t.id === selected);

  return (
    <>
      <PageHeader eyebrow="Authoring" title="Instruction Studio" description="Paste or pick an instruction, then review each drafted task against its source sentence." actions={<SyntheticBadge />} />
      <Notice tone="warning">
        Analysis here uses a simple placeholder rule set (sentence splitting and keyword matching). The extraction engine is not connected yet. Output is not clinically validated.
      </Notice>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <section className="surface flex flex-col p-5">
          <div className="flex flex-wrap items-end gap-3">
            <div className="flex-1">
              <label htmlFor="example" className="eyebrow">Example</label>
              <select
                id="example"
                className="mt-1 w-full rounded-md border border-input bg-card px-3 py-2 text-sm"
                onChange={(e) => {
                  const ex = exampleInstructions.find((x) => x.id === e.target.value);
                  if (ex) setText(ex.text);
                }}
              >
                {exampleInstructions.map((e) => <option key={e.id} value={e.id}>{e.title}</option>)}
              </select>
            </div>
            <Button onClick={analyze} disabled={!text.trim()}><Play className="h-4 w-4" /> Analyze</Button>
          </div>
          <label htmlFor="instruction" className="eyebrow mt-4">Instruction text</label>
          <textarea
            id="instruction"
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={10}
            className="mt-1 w-full flex-1 resize-y rounded-md border border-input bg-card p-3 text-sm leading-relaxed"
          />

          <h2 className="eyebrow mt-6">Source evidence</h2>
          {sentences.length === 0 ? (
            <p className="mt-2 text-sm text-muted-foreground">Run analysis to see source sentences.</p>
          ) : (
            <ol className="mt-2 space-y-1.5">
              {sentences.map((s) => {
                const linked = selTask?.sentenceId === s.id;
                return (
                  <li key={s.id} className={cn("rounded-md border px-3 py-2 text-sm transition-colors", linked ? "border-primary bg-teal-soft" : "border-transparent")}>
                    <span className="mr-2 font-mono text-xs text-muted-foreground">{s.id}</span>{s.text}
                  </li>
                );
              })}
            </ol>
          )}
        </section>

        <section aria-label="Task cards" className="space-y-3">
          {tasks.length === 0 && (
            <div className="surface p-8 text-center text-sm text-muted-foreground">No tasks yet. Choose an example and select Analyze.</div>
          )}
          {tasks.map((t) => (
            <article
              key={t.id}
              className={cn("surface p-4 transition-shadow", selected === t.id && "ring-2 ring-primary")}
            >
              <button className="w-full text-left" onClick={() => setSelected(t.id)} aria-label={`Show source for ${t.id}`}>
                <div className="flex items-center gap-2">
                  <span className="rounded bg-secondary px-2 py-0.5 font-mono text-[11px] uppercase">{t.label}</span>
                  <span className="font-mono text-xs text-muted-foreground">from {t.sentenceId}</span>
                  <span className={cn("ml-auto text-xs font-medium capitalize",
                    t.status === "accepted" && "text-success", t.status === "rejected" && "text-destructive", t.status === "edited" && "text-primary")}>{t.status}</span>
                </div>
              </button>
              {editing === t.id ? (
                <div className="mt-2">
                  <label htmlFor={`edit-${t.id}`} className="sr-only">Edit task</label>
                  <textarea id={`edit-${t.id}`} value={draft} onChange={(e) => setDraft(e.target.value)} rows={3} className="w-full rounded-md border border-input p-2 text-sm" />
                  <div className="mt-2 flex gap-2">
                    <Button size="sm" onClick={() => { update(t.id, { title: draft, status: "edited" }); setEditing(null); }}>Save</Button>
                    <Button size="sm" variant="ghost" onClick={() => setEditing(null)}>Cancel</Button>
                  </div>
                </div>
              ) : (
                <p className="mt-2 text-sm">{t.title}</p>
              )}
              {t.warnings.length > 0 && (
                <ul className="mt-3 space-y-1 rounded-md bg-warning-soft p-2.5">
                  {t.warnings.map((w) => (
                    <li key={w} className="flex gap-2 text-xs text-warning-foreground">
                      <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />{w}
                    </li>
                  ))}
                </ul>
              )}
              {editing !== t.id && (
                <div className="mt-3 flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => update(t.id, { status: "accepted" })}><Check className="h-3.5 w-3.5" /> Accept</Button>
                  <Button size="sm" variant="outline" onClick={() => { setEditing(t.id); setDraft(t.title); }}><Pencil className="h-3.5 w-3.5" /> Edit</Button>
                  <Button size="sm" variant="outline" onClick={() => update(t.id, { status: "rejected" })}><X className="h-3.5 w-3.5" /> Reject</Button>
                </div>
              )}
            </article>
          ))}
        </section>
      </div>
    </>
  );
}
