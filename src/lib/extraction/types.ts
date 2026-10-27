/**
 * Shared types for the deterministic instruction extraction engine.
 * Synthetic / rule-based only — not clinically validated.
 */

/** Inclusive-start, exclusive-end character range into the original source. */
export interface SourceSpan {
  start: number;
  end: number;
}

export interface Sentence {
  id: string;
  index: number;
  text: string;
  span: SourceSpan;
}

/** Limited set of follow-up task types the rule engine can emit. */
export type FollowUpTaskType =
  | "medication"
  | "wound_care"
  | "activity_restriction"
  | "contact_care_team"
  | "lab_or_test"
  | "appointment"
  | "dietary_restriction"
  | "general_care";

export type WarningCode =
  | "missing_date"
  | "unresolved_reference"
  | "ambiguous_timing"
  | "unsupported_assumption"
  | "missing_evidence"
  | "invalid_offset";

export interface ExtractionWarning {
  code: WarningCode;
  message: string;
  span?: SourceSpan;
  ruleId?: string;
}

export interface TaskCandidate {
  id: string;
  ruleId: string;
  type: FollowUpTaskType;
  title: string;
  /** Exact substring of the source at `span`. */
  evidence: string;
  span: SourceSpan;
  sentenceId: string;
  warnings: ExtractionWarning[];
}

export interface ExtractionResult {
  source: string;
  sentences: Sentence[];
  candidates: TaskCandidate[];
  warnings: ExtractionWarning[];
}

export interface ExtractionRule {
  id: string;
  type: FollowUpTaskType;
  /** Case-insensitive match against a single sentence. */
  pattern: RegExp;
  /** Short human-readable title derived from the matched sentence. */
  title: (sentenceText: string) => string;
}
