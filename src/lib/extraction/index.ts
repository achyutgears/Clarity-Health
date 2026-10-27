/**
 * Clarity Health instruction extraction engine (standalone).
 *
 * Deterministic, explainable rules only — not clinically validated,
 * does not call a language model, and does not generate recommendations.
 */

export type {
  ExtractionResult,
  ExtractionRule,
  ExtractionWarning,
  FollowUpTaskType,
  Sentence,
  SourceSpan,
  TaskCandidate,
  WarningCode,
} from "./types";

export { segmentSentences } from "./segment";
export { EXTRACTION_RULES, UNSUPPORTED_HINT } from "./rules";
export { extractInstructions, candidateFromSpan } from "./extract";
export {
  evidenceMatchesSource,
  isSpanInBounds,
  validateCandidate,
  validateCandidates,
} from "./validate";
export { detectAmbiguities } from "./ambiguity";
