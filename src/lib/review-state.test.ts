import { describe, expect, it } from "vitest";
import { exampleInstructions } from "./synthetic-data";
import {
  analyzeSource,
  computeReviewCounts,
  emptySnapshot,
  patchTask,
  tasksFromExtraction,
} from "./review-state";
import { extractInstructions } from "./extraction";

const SAMPLE =
  exampleInstructions[0]?.text ??
  "Keep the dressing dry for 48 hours. Call your care team if you notice fever.";

describe("analyzeSource review workflow", () => {
  it("builds review tasks from the real extraction engine (not a mock)", () => {
    const snap = analyzeSource(SAMPLE, "ex-1");
    expect(snap.phase).toBe("ready");
    expect(snap.exampleId).toBe("ex-1");
    expect(snap.sentences.length).toBeGreaterThan(1);
    expect(snap.tasks.length).toBeGreaterThan(1);

    for (const t of snap.tasks) {
      expect(t.status).toBe("pending");
      expect(t.candidate.ruleId).toMatch(/^R-/);
      expect(t.proposedTitle).toBe(t.candidate.title);
      expect(snap.source.slice(t.candidate.span.start, t.candidate.span.end)).toBe(
        t.candidate.evidence,
      );
    }
  });

  it("keeps source facts immutable when proposed wording is edited", () => {
    const snap = analyzeSource(SAMPLE);
    const id = snap.tasks[0]!.candidate.id;
    const evidenceBefore = snap.tasks[0]!.candidate.evidence;
    const spanBefore = { ...snap.tasks[0]!.candidate.span };

    const tasks = patchTask(snap.tasks, id, {
      proposedTitle: "Keep wound dressing dry for two days",
      status: "edited",
    });
    const updated = tasks.find((t) => t.candidate.id === id)!;

    expect(updated.status).toBe("edited");
    expect(updated.proposedTitle).toBe("Keep wound dressing dry for two days");
    expect(updated.candidate.evidence).toBe(evidenceBefore);
    expect(updated.candidate.span).toEqual(spanBefore);
  });

  it("supports accept and reject status transitions", () => {
    let tasks = analyzeSource(SAMPLE).tasks;
    const a = tasks[0]!.candidate.id;
    const b = tasks[1]!.candidate.id;

    tasks = patchTask(tasks, a, { status: "accepted" });
    tasks = patchTask(tasks, b, { status: "rejected" });

    const counts = computeReviewCounts(tasks);
    expect(counts.accepted).toBe(1);
    expect(counts.rejected).toBe(1);
    expect(counts.pending).toBe(tasks.length - 2);
    expect(counts.total).toBe(tasks.length);
    expect(counts.flagged).toBe(tasks.filter((t) => t.candidate.warnings.length > 0).length);
  });

  it("surfaces unresolved warnings from the engine on candidates", () => {
    const snap = analyzeSource("Take the prescribed pain medication as directed.");
    expect(snap.tasks).toHaveLength(1);
    const codes = snap.tasks[0]!.candidate.warnings.map((w) => w.code);
    expect(codes).toContain("unresolved_reference");
    expect(computeReviewCounts(snap.tasks).flagged).toBe(1);
  });

  it("throws a clear error for empty documents", () => {
    expect(() => analyzeSource("   ")).toThrow(/instruction text/i);
  });

  it("emptySnapshot starts idle with no tasks", () => {
    const s = emptySnapshot();
    expect(s.phase).toBe("idle");
    expect(s.tasks).toEqual([]);
    expect(computeReviewCounts(s.tasks).total).toBe(0);
  });

  it("tasksFromExtraction mirrors extractInstructions candidates 1:1", () => {
    const result = extractInstructions(SAMPLE);
    const tasks = tasksFromExtraction(result);
    expect(tasks.map((t) => t.candidate.id)).toEqual(result.candidates.map((c) => c.id));
  });
});
