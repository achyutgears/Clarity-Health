/**
 * Deterministic instruction extraction — no LLM, no clinical recommendations.
 */
import { detectAmbiguities } from "./ambiguity";
import { EXTRACTION_RULES, UNSUPPORTED_HINT } from "./rules";
import { segmentSentences } from "./segment";
import type {
  ExtractionResult,
  ExtractionWarning,
  Sentence,
  TaskCandidate,
} from "./types";
import { validateCandidate } from "./validate";

/**
 * Extract follow-up task candidates from a source document.
 *
 * Pipeline: segment → rule match → ambiguity flags → offset/evidence validation.
 */
export function extractInstructions(source: string): ExtractionResult {
  const sentences = segmentSentences(source);
  const candidates: TaskCandidate[] = [];
  const documentWarnings: ExtractionWarning[] = [];
  let taskSeq = 0;

  for (const sentence of sentences) {
    const matched = matchRule(sentence);
    if (matched) {
      taskSeq += 1;
      const candidate = buildCandidate(source, sentence, matched, taskSeq);
      candidates.push(candidate);
      continue;
    }

    if (UNSUPPORTED_HINT.test(sentence.text)) {
      documentWarnings.push({
        code: "unsupported_assumption",
        message: `Sentence ${sentence.id} looks instructional but matches no supported rule.`,
        span: sentence.span,
      });
    }
  }

  return {
    source,
    sentences,
    candidates,
    warnings: documentWarnings,
  };
}

function matchRule(sentence: Sentence) {
  for (const rule of EXTRACTION_RULES) {
    // Fresh lastIndex for global / sticky patterns (rules are shared).
    rule.pattern.lastIndex = 0;
    if (rule.pattern.test(sentence.text)) {
      return rule;
    }
  }
  return null;
}

function buildCandidate(
  source: string,
  sentence: Sentence,
  rule: (typeof EXTRACTION_RULES)[number],
  seq: number,
): TaskCandidate {
  const evidence = source.slice(sentence.span.start, sentence.span.end);
  const ambiguity = detectAmbiguities(sentence.text, sentence.span);

  const candidate: TaskCandidate = {
    id: `task-${seq}`,
    ruleId: rule.id,
    type: rule.type,
    title: rule.title(sentence.text),
    evidence,
    span: { ...sentence.span },
    sentenceId: sentence.id,
    warnings: [...ambiguity],
  };

  const integrity = validateCandidate(source, candidate);
  candidate.warnings.push(...integrity);
  return candidate;
}

/**
 * Build a candidate with caller-supplied span/evidence (for validation tests
 * and adapters). Still runs ambiguity + integrity checks against `source`.
 */
export function candidateFromSpan(
  source: string,
  opts: {
    id: string;
    ruleId: string;
    type: TaskCandidate["type"];
    title: string;
    span: TaskCandidate["span"];
    evidence: string;
    sentenceId: string;
  },
): TaskCandidate {
  const ambiguity = detectAmbiguities(opts.evidence, opts.span);
  const candidate: TaskCandidate = {
    id: opts.id,
    ruleId: opts.ruleId,
    type: opts.type,
    title: opts.title,
    evidence: opts.evidence,
    span: { ...opts.span },
    sentenceId: opts.sentenceId,
    warnings: [...ambiguity],
  };
  candidate.warnings.push(...validateCandidate(source, candidate));
  return candidate;
}
