/**
 * Application review state built on the deterministic extraction engine.
 * Keeps source facts (engine evidence) separate from proposed task wording.
 */
import {
  extractInstructions,
  type ExtractionResult,
  type ExtractionWarning,
  type FollowUpTaskType,
  type Sentence,
  type TaskCandidate,
} from "./extraction";
import type { TaskStatus } from "./synthetic-data";

export type AnalysisPhase = "idle" | "loading" | "ready" | "error";

export interface ReviewTask {
  /** Immutable engine candidate — source span, evidence, rule metadata. */
  candidate: TaskCandidate;
  /** Editable proposed wording shown to the reviewer. */
  proposedTitle: string;
  status: TaskStatus;
}

export interface ReviewSnapshot {
  phase: AnalysisPhase;
  error: string | null;
  exampleId: string | null;
  source: string;
  sentences: Sentence[];
  documentWarnings: ExtractionWarning[];
  tasks: ReviewTask[];
  selectedTaskId: string | null;
}

export interface ReviewCounts {
  total: number;
  pending: number;
  accepted: number;
  rejected: number;
  edited: number;
  flagged: number;
  byType: { type: FollowUpTaskType; n: number }[];
}

export const TASK_TYPE_ORDER: FollowUpTaskType[] = [
  "medication",
  "wound_care",
  "activity_restriction",
  "contact_care_team",
  "lab_or_test",
  "appointment",
  "dietary_restriction",
  "general_care",
];

export const emptySnapshot = (): ReviewSnapshot => ({
  phase: "idle",
  error: null,
  exampleId: null,
  source: "",
  sentences: [],
  documentWarnings: [],
  tasks: [],
  selectedTaskId: null,
});

export function tasksFromExtraction(result: ExtractionResult): ReviewTask[] {
  return result.candidates.map((candidate) => ({
    candidate,
    proposedTitle: candidate.title,
    status: "pending" as const,
  }));
}

/** Run the real engine. Throws if source is empty after trim. */
export function analyzeSource(source: string, exampleId: string | null = null): ReviewSnapshot {
  const trimmed = source.trim();
  if (!trimmed) {
    throw new Error("Add instruction text before running analysis.");
  }

  const result = extractInstructions(source);
  const tasks = tasksFromExtraction(result);

  return {
    phase: "ready",
    error: null,
    exampleId,
    source: result.source,
    sentences: result.sentences,
    documentWarnings: result.warnings,
    tasks,
    selectedTaskId: tasks[0]?.candidate.id ?? null,
  };
}

export function computeReviewCounts(tasks: ReviewTask[]): ReviewCounts {
  const byType = TASK_TYPE_ORDER.map((type) => ({
    type,
    n: tasks.filter((t) => t.candidate.type === type).length,
  })).filter((row) => row.n > 0);

  return {
    total: tasks.length,
    pending: tasks.filter((t) => t.status === "pending").length,
    accepted: tasks.filter((t) => t.status === "accepted").length,
    rejected: tasks.filter((t) => t.status === "rejected").length,
    edited: tasks.filter((t) => t.status === "edited").length,
    flagged: tasks.filter((t) => t.candidate.warnings.length > 0).length,
    byType,
  };
}

/** Flagged = candidates that still have ambiguity/integrity warnings. */
export function countFlaggedWarnings(tasks: ReviewTask[]): number {
  return tasks.filter((t) => t.candidate.warnings.length > 0).length;
}

export function patchTask(
  tasks: ReviewTask[],
  id: string,
  patch: Partial<Pick<ReviewTask, "proposedTitle" | "status">>,
): ReviewTask[] {
  return tasks.map((t) => (t.candidate.id === id ? { ...t, ...patch } : t));
}

export function formatTaskType(type: FollowUpTaskType): string {
  return type.replace(/_/g, " ");
}

export function warningLabel(code: ExtractionWarning["code"]): string {
  switch (code) {
    case "missing_date":
      return "Missing date";
    case "unresolved_reference":
      return "Unresolved reference";
    case "ambiguous_timing":
      return "Ambiguous timing";
    case "unsupported_assumption":
      return "Unsupported assumption";
    case "missing_evidence":
      return "Evidence mismatch";
    case "invalid_offset":
      return "Invalid offset";
    default:
      return code;
  }
}
