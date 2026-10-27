import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  AlertTriangle,
  Check,
  Pencil,
  X,
  Play,
  Bookmark,
  Loader2,
  Trash2,
} from "lucide-react";
import { useAuth } from "@/lib/auth";
import { deleteSaved, listSaved, saveInstruction, type SavedInstruction } from "@/lib/saved-instructions";
import { toast } from "sonner";
import { PageHeader, Notice, SyntheticBadge } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { exampleInstructions } from "@/lib/synthetic-data";
import { useReviewSession } from "@/lib/review-session";
import {
  formatTaskType,
  warningLabel,
  type ReviewTask,
} from "@/lib/review-state";
import type { SourceSpan } from "@/lib/extraction";
import { pageMeta } from "@/lib/seo";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/instructions")({
  head: () =>
    pageMeta(
      "Instruction Studio",
      "Break healthcare instructions into reviewable tasks with source evidence.",
    ),
  component: Studio,
});

function Studio() {
  const {
    snapshot,
    counts,
    selectedTask,
    setSource,
    loadExample,
    runAnalysis,
    selectTask,
    setTaskStatus,
    saveEditedTitle,
    phase,
  } = useReviewSession();

  const [exampleId, setExampleId] = useState(exampleInstructions[0]?.id ?? "");
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState("");

  const { user, requireAuth } = useAuth();
  const [saved, setSaved] = useState<SavedInstruction[] | null>(null);
  const [saving, setSaving] = useState(false);
  const [loadErr, setLoadErr] = useState<string | null>(null);

  // Keep the example dropdown aligned with session state (including SSR seed).
  useEffect(() => {
    if (snapshot.exampleId) setExampleId(snapshot.exampleId);
  }, [snapshot.exampleId]);

  const refresh = useCallback(async () => {
    try {
      setLoadErr(null);
      setSaved(await listSaved());
    } catch (e) {
      setLoadErr((e as Error).message);
    }
  }, []);
  useEffect(() => {
    if (user) refresh();
    else setSaved(null);
  }, [user, refresh]);

  const doSave = async () => {
    if (!snapshot.source.trim()) {
      toast.error("Add some instruction text first.");
      return;
    }
    setSaving(true);
    try {
      await saveInstruction(
        snapshot.source.trim().split(/[.!?]/)[0]?.slice(0, 80) ?? "Untitled",
        snapshot.source,
      );
      toast.success("Saved to your account");
      await refresh();
    } catch (e) {
      toast.error(`Could not save: ${(e as Error).message}`);
    } finally {
      setSaving(false);
    }
  };

  const onAnalyze = () => {
    setEditing(null);
    runAnalysis();
  };

  const prevPhase = useRef(phase);
  useEffect(() => {
    const from = prevPhase.current;
    prevPhase.current = phase;
    if (from !== "loading") return;
    if (phase === "ready") {
      toast.success(
        `Extracted ${snapshot.tasks.length} task${snapshot.tasks.length === 1 ? "" : "s"} from ${snapshot.sentences.length} sentence${snapshot.sentences.length === 1 ? "" : "s"}`,
      );
    } else if (phase === "error" && snapshot.error) {
      toast.error(snapshot.error);
    }
  }, [phase, snapshot.tasks.length, snapshot.sentences.length, snapshot.error]);

  const highlightSpan = selectedTask?.candidate.span ?? null;

  return (
    <>
      <PageHeader
        eyebrow="01 · Authoring"
        title="Instruction Studio"
        description="Paste or pick a fictional instruction, run the rule engine, then accept, edit, or reject each candidate against its source span."
        actions={
          <div className="flex items-center gap-3">
            <SyntheticBadge />
            <Button
              variant="outline"
              disabled={saving}
              onClick={() =>
                requireAuth(
                  "Saving an instruction stores it in your personal account so you can return to it later.",
                  doSave,
                )
              }
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Bookmark className="h-4 w-4" />}{" "}
              Save to account
            </Button>
          </div>
        }
      />
      <Notice tone="warning">
        Analysis uses the deterministic extraction engine (sentence offsets + explainable rules). Output is not clinically validated and is not a language-model response.
      </Notice>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <section className="flex flex-col border-t-2 border-foreground pt-5" aria-label="Source document">
          <div className="flex flex-wrap items-end gap-3">
            <div className="flex-1">
              <label htmlFor="example" className="eyebrow">
                Fictional example
              </label>
              <select
                id="example"
                value={exampleId}
                className="mt-1 w-full rounded-md border border-input bg-card px-3 py-2 text-sm"
                onChange={(e) => {
                  const id = e.target.value;
                  setExampleId(id);
                  const ex = exampleInstructions.find((x) => x.id === id);
                  if (ex) {
                    loadExample(ex.id, ex.text);
                    setEditing(null);
                  }
                }}
              >
                {exampleInstructions.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.title}
                  </option>
                ))}
              </select>
            </div>
            <Button onClick={onAnalyze} disabled={!snapshot.source.trim() || phase === "loading"}>
              {phase === "loading" ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Play className="h-4 w-4" />
              )}{" "}
              {phase === "loading" ? "Analyzing…" : "Run analysis"}
            </Button>
          </div>

          <label htmlFor="instruction" className="eyebrow mt-4">
            Document input
          </label>
          <textarea
            id="instruction"
            value={snapshot.source}
            onChange={(e) => setSource(e.target.value)}
            rows={10}
            className="paper mt-1 w-full flex-1 resize-y rounded-sm border border-input p-4 font-mono text-[13px] leading-[1.75rem]"
            placeholder="Paste discharge or follow-up instructions here…"
          />

          <h2 className="eyebrow mt-6">Source evidence · character offsets</h2>
          {phase === "loading" ? (
            <p className="mt-2 inline-flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Segmenting source…
            </p>
          ) : phase === "error" ? (
            <p role="alert" className="mt-2 text-sm text-destructive">
              {snapshot.error}
            </p>
          ) : phase !== "ready" ? (
            <p className="mt-2 text-sm text-muted-foreground">
              Run analysis to segment the document and highlight evidence spans.
            </p>
          ) : (
            <div className="mt-2 space-y-3">
              <SourceHighlight source={snapshot.source} span={highlightSpan} />
              <ol className="space-y-1.5">
                {snapshot.sentences.map((s) => {
                  const linked = selectedTask?.candidate.sentenceId === s.id;
                  return (
                    <li
                      key={s.id}
                      className={cn(
                        "border-l-2 px-3 py-2 font-mono text-[13px] transition-colors",
                        linked ? "border-primary bg-teal-soft" : "border-border",
                      )}
                    >
                      <div className="mb-1 flex flex-wrap gap-2 text-[11px] text-muted-foreground">
                        <span>{s.id}</span>
                        <span>
                          [{s.span.start}, {s.span.end})
                        </span>
                      </div>
                      {s.text}
                    </li>
                  );
                })}
              </ol>
              {snapshot.documentWarnings.length > 0 && (
                <ul className="space-y-1 rounded-md bg-warning-soft p-2.5">
                  {snapshot.documentWarnings.map((w, i) => (
                    <li key={`${w.code}-${i}`} className="flex gap-2 text-xs text-warning-foreground">
                      <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
                      <span>
                        <span className="font-medium">{warningLabel(w.code)}:</span> {w.message}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </section>

        <section aria-label="Extracted tasks" className="space-y-3">
          <div className="flex flex-wrap items-baseline justify-between gap-2 border-t-2 border-primary pt-5">
            <div className="eyebrow">
              Candidate tasks
              {phase === "ready" ? ` · ${counts.total}` : ""}
            </div>
            {phase === "ready" && (
              <p className="text-xs text-muted-foreground">
                {counts.pending} pending · {counts.accepted} accepted · {counts.edited} edited ·{" "}
                {counts.rejected} rejected
              </p>
            )}
          </div>

          {phase === "loading" && (
            <div className="surface flex items-center justify-center gap-2 p-10 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Running extraction engine…
            </div>
          )}

          {phase === "error" && (
            <div role="alert" className="surface border-destructive/40 p-6 text-sm text-destructive">
              {snapshot.error}
              <div className="mt-3">
                <Button size="sm" variant="outline" onClick={onAnalyze}>
                  Try again
                </Button>
              </div>
            </div>
          )}

          {(phase === "idle" || (phase === "ready" && snapshot.tasks.length === 0)) && (
            <div className="surface p-8 text-center text-sm text-muted-foreground">
              {phase === "ready"
                ? "No supported task candidates matched this document. Check document-level warnings on the left."
                : "No tasks yet. Choose a fictional example and select Run analysis."}
            </div>
          )}

          {phase === "ready" &&
            snapshot.tasks.map((t) => (
              <TaskCard
                key={t.candidate.id}
                task={t}
                selected={selectedTask?.candidate.id === t.candidate.id}
                editing={editing === t.candidate.id}
                draft={draft}
                onSelect={() => selectTask(t.candidate.id)}
                onAccept={() => setTaskStatus(t.candidate.id, "accepted")}
                onReject={() => setTaskStatus(t.candidate.id, "rejected")}
                onStartEdit={() => {
                  setEditing(t.candidate.id);
                  setDraft(t.proposedTitle);
                }}
                onDraftChange={setDraft}
                onSaveEdit={() => {
                  saveEditedTitle(t.candidate.id, draft);
                  setEditing(null);
                }}
                onCancelEdit={() => setEditing(null)}
              />
            ))}
        </section>
      </div>

      <section className="mt-16 rule-top" aria-label="Saved instructions">
        <h2 className="font-display text-3xl">Your saved instructions</h2>
        {!user ? (
          <p className="mt-3 text-sm text-muted-foreground">
            Sign in to keep instructions in a personal workspace.{" "}
            <button
              className="font-medium text-foreground underline underline-offset-4"
              onClick={() => requireAuth("Your saved instructions are private to your account.")}
            >
              Sign in
            </button>
          </p>
        ) : loadErr ? (
          <p role="alert" className="mt-3 text-sm text-destructive">
            Could not load saved instructions: {loadErr}
          </p>
        ) : saved === null ? (
          <p className="mt-3 inline-flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading…
          </p>
        ) : saved.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">Nothing saved yet. Use “Save to account” above.</p>
        ) : (
          <ul className="mt-4 divide-y border-y">
            {saved.map((s) => (
              <li key={s.id} className="flex items-center gap-4 py-3">
                <button
                  className="min-w-0 flex-1 text-left"
                  onClick={() => {
                    loadExample(`saved-${s.id}`, s.content);
                    setExampleId("");
                    setEditing(null);
                    window.scrollTo({ top: 0, behavior: "smooth" });
                  }}
                >
                  <div className="truncate text-sm font-medium">{s.title}</div>
                  <div className="eyebrow mt-0.5">{new Date(s.created_at).toLocaleString()}</div>
                </button>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label={`Delete ${s.title}`}
                  onClick={async () => {
                    try {
                      await deleteSaved(s.id);
                      await refresh();
                      toast.success("Deleted");
                    } catch (e) {
                      toast.error((e as Error).message);
                    }
                  }}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}

function SourceHighlight({ source, span }: { source: string; span: SourceSpan | null }) {
  if (!span) {
    return (
      <pre className="paper max-h-48 overflow-auto whitespace-pre-wrap rounded-sm border border-input p-3 font-mono text-[12px] leading-relaxed text-muted-foreground">
        {source}
      </pre>
    );
  }

  const before = source.slice(0, span.start);
  const mid = source.slice(span.start, span.end);
  const after = source.slice(span.end);

  return (
    <pre
      className="paper max-h-48 overflow-auto whitespace-pre-wrap rounded-sm border border-input p-3 font-mono text-[12px] leading-relaxed"
      aria-label="Source with highlighted evidence"
    >
      {before}
      <mark className="rounded-sm bg-teal-soft px-0.5 text-foreground">{mid}</mark>
      {after}
    </pre>
  );
}

function TaskCard({
  task,
  selected,
  editing,
  draft,
  onSelect,
  onAccept,
  onReject,
  onStartEdit,
  onDraftChange,
  onSaveEdit,
  onCancelEdit,
}: {
  task: ReviewTask;
  selected: boolean;
  editing: boolean;
  draft: string;
  onSelect: () => void;
  onAccept: () => void;
  onReject: () => void;
  onStartEdit: () => void;
  onDraftChange: (v: string) => void;
  onSaveEdit: () => void;
  onCancelEdit: () => void;
}) {
  const { candidate, proposedTitle, status } = task;
  const unresolved = candidate.warnings;

  return (
    <article
      className={cn("surface p-4 transition-shadow", selected && "ring-2 ring-primary")}
      data-testid={`task-card-${candidate.id}`}
    >
      <button className="w-full text-left" onClick={onSelect} aria-label={`Show source for ${candidate.id}`}>
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded bg-secondary px-2 py-0.5 font-mono text-[11px] uppercase">
            {formatTaskType(candidate.type)}
          </span>
          <span className="font-mono text-xs text-muted-foreground">{candidate.ruleId}</span>
          <span className="font-mono text-xs text-muted-foreground">from {candidate.sentenceId}</span>
          <span
            className={cn(
              "ml-auto text-xs font-medium capitalize",
              status === "accepted" && "text-success",
              status === "rejected" && "text-destructive",
              status === "edited" && "text-primary",
            )}
          >
            {status}
          </span>
        </div>
      </button>

      <div className="mt-3 space-y-3">
        <div>
          <div className="eyebrow">Proposed task wording</div>
          {editing ? (
            <div className="mt-1">
              <label htmlFor={`edit-${candidate.id}`} className="sr-only">
                Edit proposed wording
              </label>
              <textarea
                id={`edit-${candidate.id}`}
                value={draft}
                onChange={(e) => onDraftChange(e.target.value)}
                rows={3}
                className="w-full rounded-md border border-input p-2 text-sm"
              />
              <div className="mt-2 flex gap-2">
                <Button size="sm" onClick={onSaveEdit} disabled={!draft.trim()}>
                  Save
                </Button>
                <Button size="sm" variant="ghost" onClick={onCancelEdit}>
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <p className="mt-1 text-sm">{proposedTitle}</p>
          )}
        </div>

        <div className="rounded-md border border-dashed border-border bg-muted/40 p-2.5">
          <div className="eyebrow">Source fact</div>
          <p className="mt-1 font-mono text-[12px] leading-relaxed">{candidate.evidence}</p>
          <p className="mt-1 font-mono text-[11px] text-muted-foreground">
            offsets [{candidate.span.start}, {candidate.span.end})
          </p>
        </div>

        {unresolved.length > 0 && (
          <div>
            <div className="eyebrow text-warning-foreground">Unresolved information</div>
            <ul className="mt-1.5 space-y-1 rounded-md bg-warning-soft p-2.5">
              {unresolved.map((w, i) => (
                <li key={`${w.code}-${i}`} className="flex gap-2 text-xs text-warning-foreground">
                  <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
                  <span>
                    <span className="font-medium">{warningLabel(w.code)}:</span> {w.message}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {!editing && (
        <div className="mt-3 flex gap-2">
          <Button size="sm" variant="outline" onClick={onAccept}>
            <Check className="h-3.5 w-3.5" /> Accept
          </Button>
          <Button size="sm" variant="outline" onClick={onStartEdit}>
            <Pencil className="h-3.5 w-3.5" /> Edit
          </Button>
          <Button size="sm" variant="outline" onClick={onReject}>
            <X className="h-3.5 w-3.5" /> Reject
          </Button>
        </div>
      )}
    </article>
  );
}
