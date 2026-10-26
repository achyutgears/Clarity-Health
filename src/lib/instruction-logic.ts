// Placeholder rule-based logic. This is NOT the extraction engine and is not
// clinically validated. It exists so the interface can be exercised end to end.
import type { ExpectedLabel, TaskStatus } from "./synthetic-data";

export interface SourceSentence {
  id: string;
  index: number;
  text: string;
}

export interface DraftTask {
  id: string;
  sentenceId: string;
  title: string;
  label: ExpectedLabel;
  warnings: string[];
  status: TaskStatus;
}

export function splitSentences(text: string): SourceSentence[] {
  return text
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter(Boolean)
    .map((t, i) => ({ id: `s${i + 1}`, index: i + 1, text: t }));
}

export function classifySentence(text: string): ExpectedLabel {
  const t = text.toLowerCase();
  if (/\b(do not|don't|avoid|never)\b/.test(t)) return "prohibition";
  if (/\b(call|seek|emergency|if you notice|if you develop)\b/.test(t)) return "warning";
  if (/\b(\d+\s*(hours?|days?|weeks?|minutes?)|every|daily|before|after)\b/.test(t)) return "timing";
  return "action";
}

export function detectWarnings(text: string): string[] {
  const w: string[] = [];
  const t = text.toLowerCase();
  if (/\bas directed\b/.test(t)) w.push("Vague reference: “as directed” has no explicit dose or schedule.");
  if (/\bunless\b|\bbut\b/.test(t)) w.push("Conditional clause: confirm the exception is captured.");
  if (/\b(gently|small|mild)\b/.test(t)) w.push("Subjective qualifier may be interpreted differently.");
  if (text.length > 140) w.push("Long sentence: may contain more than one task.");
  return w;
}

export function draftTasks(sentences: SourceSentence[]): DraftTask[] {
  return sentences.map((s) => ({
    id: `task-${s.id}`,
    sentenceId: s.id,
    title: s.text,
    label: classifySentence(s.text),
    warnings: detectWarnings(s.text),
    status: "pending",
  }));
}

export const LABELS: ExpectedLabel[] = ["action", "prohibition", "warning", "timing"];

export interface EvalResult {
  id: string;
  expected: ExpectedLabel;
  predicted: ExpectedLabel;
  pass: boolean;
}

export function computeMetrics(results: EvalResult[]) {
  const matrix = LABELS.map((e) => LABELS.map((p) => results.filter((r) => r.expected === e && r.predicted === p).length));
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
