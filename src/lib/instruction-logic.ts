/**
 * Adapters and eval helpers used by the Reliability Lab.
 * Document extraction for the studio lives in `./extraction` + `./review-session`.
 */
import { extractInstructions, segmentSentences } from "./extraction";
import type { ExpectedLabel, TaskStatus } from "./synthetic-data";

export interface SourceSentence {
  id: string;
  index: number;
  text: string;
  start: number;
  end: number;
}

export interface DraftTask {
  id: string;
  sentenceId: string;
  title: string;
  label: ExpectedLabel;
  warnings: string[];
  status: TaskStatus;
  ruleId?: string;
}

export function splitSentences(text: string): SourceSentence[] {
  return segmentSentences(text).map((s) => ({
    id: s.id,
    index: s.index,
    text: s.text,
    start: s.span.start,
    end: s.span.end,
  }));
}

/** Map engine task types onto the reliability-lab ExpectedLabel vocabulary. */
export function classifySentence(text: string): ExpectedLabel {
  const t = text.toLowerCase();
  if (/\b(do not|don't|avoid|never)\b/.test(t)) return "prohibition";
  if (/\b(call|seek|emergency|if you notice|if you develop)\b/.test(t)) return "warning";
  if (/\b(\d+\s*(hours?|days?|weeks?|minutes?)|every|daily|before|after)\b/.test(t)) return "timing";
  return "action";
}

export function detectWarnings(text: string): string[] {
  const result = extractInstructions(text);
  const fromEngine = result.candidates.flatMap((c) => c.warnings.map((w) => w.message));
  const doc = result.warnings.map((w) => w.message);
  return [...fromEngine, ...doc];
}

/** Build draft tasks from the real extraction engine for a full source document. */
export function draftTasksFromSource(source: string): DraftTask[] {
  const result = extractInstructions(source);
  return result.candidates.map((c) => ({
    id: c.id,
    sentenceId: c.sentenceId,
    title: c.title,
    label: classifySentence(c.evidence),
    warnings: c.warnings.map((w) => w.message),
    status: "pending" as const,
    ruleId: c.ruleId,
  }));
}

/** @deprecated Prefer draftTasksFromSource(source) — kept for call sites that only have sentences. */
export function draftTasks(sentences: SourceSentence[]): DraftTask[] {
  const source = sentences.map((s) => s.text).join(" ");
  if (!source.trim()) return [];
  // Re-extract from joined text so rule IDs stay engine-backed (offsets will not match originals).
  return draftTasksFromSource(source);
}

export const LABELS: ExpectedLabel[] = ["action", "prohibition", "warning", "timing"];

export interface EvalResult {
  id: string;
  expected: ExpectedLabel;
  predicted: ExpectedLabel;
  pass: boolean;
}

export function computeMetrics(results: EvalResult[]) {
  const matrix = LABELS.map((e) =>
    LABELS.map((p) => results.filter((r) => r.expected === e && r.predicted === p).length),
  );
  const passed = results.filter((r) => r.pass).length;
  const perLabel = LABELS.map((l, i) => {
    const tp = matrix[i]?.[i] ?? 0;
    const fp = LABELS.reduce((s, _, j) => s + (j !== i ? (matrix[j]?.[i] ?? 0) : 0), 0);
    const fn = LABELS.reduce((s, _, j) => s + (j !== i ? (matrix[i]?.[j] ?? 0) : 0), 0);
    return {
      label: l,
      precision: tp + fp ? tp / (tp + fp) : null,
      recall: tp + fn ? tp / (tp + fn) : null,
    };
  });
  return { total: results.length, passed, failed: results.length - passed, matrix, perLabel };
}
