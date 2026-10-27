/**
 * Deterministic ambiguity / quality flags for extracted instruction text.
 * Does not invent clinical advice — only surface uncertainty in the wording.
 */
import type { ExtractionWarning, SourceSpan } from "./types";

const MISSING_DATE =
  /\b(soon|later|next week|next month|in the (near )?future|when (you(?:'re| are) (?:ready|able)|appropriate)|at (?:your|the) (?:convenience|earliest)|as soon as possible|asap)\b/i;

const UNRESOLVED_REFERENCE =
  /\b(as directed|as instructed|as needed|prn|the (?:medication|medicine|dose|procedure|appointment)|that (?:medication|medicine|dose)|your (?:usual|normal) (?:dose|medication))\b/i;

const AMBIGUOUS_TIMING =
  /\b(occasionally|periodically|regularly|frequently|from time to time|a (?:few|couple of) (?:days|hours|weeks)|several (?:days|hours|weeks)|sometime|for a while|until (?:better|improved|resolved))\b/i;

const UNSUPPORTED_ASSUMPTION =
  /\b(you (?:already )?know|obviously|of course|as (?:we|you) discussed|per (?:protocol|standard)|clinically indicated|if appropriate)\b/i;

/**
 * Scan `text` (typically a sentence or evidence span) for ambiguity signals.
 * When `span` is provided it is attached to each warning for source tracing.
 */
export function detectAmbiguities(text: string, span?: SourceSpan): ExtractionWarning[] {
  const warnings: ExtractionWarning[] = [];
  const push = (code: ExtractionWarning["code"], message: string) => {
    const w: ExtractionWarning = { code, message };
    if (span) w.span = span;
    warnings.push(w);
  };

  if (MISSING_DATE.test(text)) {
    push(
      "missing_date",
      "Timing refers to a relative or vague date without a concrete calendar date or duration.",
    );
  }

  if (UNRESOLVED_REFERENCE.test(text)) {
    push(
      "unresolved_reference",
      "Instruction refers to something not fully specified in this sentence (e.g. “as directed”).",
    );
  }

  if (AMBIGUOUS_TIMING.test(text)) {
    push(
      "ambiguous_timing",
      "Schedule or frequency is ambiguous and may need clarification.",
    );
  }

  if (UNSUPPORTED_ASSUMPTION.test(text)) {
    push(
      "unsupported_assumption",
      "Wording assumes prior context or clinical judgment that is not stated here.",
    );
  }

  return warnings;
}
