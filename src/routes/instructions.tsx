import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { AlertTriangle, Check, Pencil, X, Play, Bookmark, Loader2, Trash2 } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { deleteSaved, listSaved, saveInstruction, type SavedInstruction } from "@/lib/saved-instructions";
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
  const [text, setText] = useState(exampleInstructions[0]?.text ?? "");
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
  const { user, requireAuth } = useAuth();
  const [saved, setSaved] = useState<SavedInstruction[] | null>(null);
  const [saving, setSaving] = useState(false);
  const [loadErr, setLoadErr] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try { setLoadErr(null); setSaved(await listSaved()); } catch (e) { setLoadErr((e as Error).message); }
  }, []);
  useEffect(() => { if (user) refresh(); else setSaved(null); }, [user, refresh]);

  const doSave = async () => {
    if (!text.trim()) return toast.error("Add some instruction text first.");
    setSaving(true);
    try {
      await saveInstruction(text.trim().split(/[.!?]/)[0]?.slice(0, 80) ?? "Untitled", text);
      toast.success("Saved to your account");
      await refresh();
    } catch (e) { toast.error(`Could not save: ${(e as Error).message}`); }
    finally { setSaving(false); }
  };

  return (
    <>
      <PageHeader eyebrow="01 · Authoring" title="Instruction Studio" description="Paste or pick an instruction, then review each drafted task against its source sentence." actions={
        <div className="flex items-center gap-3">
          <SyntheticBadge />
          <Button variant="outline" disabled={saving} onClick={() => requireAuth("Saving an instruction stores it in your personal account so you can return to it later.", doSave)}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Bookmark className="h-4 w-4" />} Save to account
          </Button>
        </div>} />
      <Notice tone="warning">
        Analysis here uses a simple placeholder rule set (sentence splitting and keyword matching). The extraction engine is not connected yet. Output is not clinically validated.
      </Notice>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <section className="flex flex-col border-t-2 border-foreground pt-5" aria-label="Source">
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
            className="paper mt-1 w-full flex-1 resize-y rounded-sm border border-input p-4 font-mono text-[13px] leading-[1.75rem]"
          />

          <h2 className="eyebrow mt-6">Source evidence · sentence offsets</h2>
          {sentences.length === 0 ? (
            <p className="mt-2 text-sm text-muted-foreground">Run analysis to see source sentences.</p>
          ) : (
            <ol className="mt-2 space-y-1.5">
              {sentences.map((s) => {
                const linked = selTask?.sentenceId === s.id;
                return (
                  <li key={s.id} className={cn("border-l-2 px-3 py-2 font-mono text-[13px] transition-colors", linked ? "border-primary bg-teal-soft" : "border-border")}>
                    <span className="mr-2 font-mono text-xs text-muted-foreground">{s.id}</span>{s.text}
                  </li>
                );
              })}
            </ol>
          )}
        </section>

        <section aria-label="Extracted tasks" className="space-y-3">
          <div className="eyebrow border-t-2 border-primary pt-5">Extracted tasks · {tasks.length}</div>
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

      <section className="mt-16 rule-top" aria-label="Saved instructions">
        <h2 className="font-display text-3xl">Your saved instructions</h2>
        {!user ? (
          <p className="mt-3 text-sm text-muted-foreground">
            Sign in to keep instructions in a personal workspace.{" "}
            <button className="font-medium text-foreground underline underline-offset-4" onClick={() => requireAuth("Your saved instructions are private to your account.")}>Sign in</button>
          </p>
        ) : loadErr ? (
          <p role="alert" className="mt-3 text-sm text-destructive">Could not load saved instructions: {loadErr}</p>
        ) : saved === null ? (
          <p className="mt-3 inline-flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Loading…</p>
        ) : saved.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">Nothing saved yet. Use “Save to account” above.</p>
        ) : (
          <ul className="mt-4 divide-y border-y">
            {saved.map((s) => (
              <li key={s.id} className="flex items-center gap-4 py-3">
                <button className="min-w-0 flex-1 text-left" onClick={() => { setText(s.content); setTasks([]); setSentences([]); window.scrollTo({ top: 0, behavior: "smooth" }); }}>
                  <div className="truncate text-sm font-medium">{s.title}</div>
                  <div className="eyebrow mt-0.5">{new Date(s.created_at).toLocaleString()}</div>
                </button>
                <Button variant="ghost" size="icon" aria-label={`Delete ${s.title}`} onClick={async () => {
                  try { await deleteSaved(s.id); await refresh(); toast.success("Deleted"); } catch (e) { toast.error((e as Error).message); }
                }}><Trash2 className="h-4 w-4" /></Button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}
