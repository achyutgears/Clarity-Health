/**
 * Offset and evidence integrity checks for extraction candidates.
 */
import type { ExtractionWarning, SourceSpan, TaskCandidate } from "./types";

export function isSpanInBounds(source: string, span: SourceSpan): boolean {
  return (
    Number.isInteger(span.start) &&
    Number.isInteger(span.end) &&
    span.start >= 0 &&
    span.end <= source.length &&
    span.start <= span.end
  );
}

export function evidenceMatchesSource(source: string, span: SourceSpan, evidence: string): boolean {
  if (!isSpanInBounds(source, span)) return false;
  return source.slice(span.start, span.end) === evidence;
}

/**
 * Validate a candidate against the original source.
 * Emits `invalid_offset` and/or `missing_evidence` when checks fail.
 */
export function validateCandidate(source: string, candidate: TaskCandidate): ExtractionWarning[] {
  const warnings: ExtractionWarning[] = [];
  const { span, evidence, ruleId } = candidate;

  if (!isSpanInBounds(source, span)) {
    warnings.push({
      code: "invalid_offset",
      message: `Span [${span.start}, ${span.end}) is out of bounds for source length ${source.length}.`,
      span,
      ruleId,
    });
    return warnings;
  }

  const actual = source.slice(span.start, span.end);
  if (actual !== evidence) {
    warnings.push({
      code: "missing_evidence",
      message: "Evidence text does not equal the exact source substring at the given offsets.",
      span,
      ruleId,
    });
  }

  return warnings;
}

/** Validate every candidate; returns per-candidate warning lists (same order). */
export function validateCandidates(
  source: string,
  candidates: TaskCandidate[],
): ExtractionWarning[][] {
  return candidates.map((c) => validateCandidate(source, c));
}
