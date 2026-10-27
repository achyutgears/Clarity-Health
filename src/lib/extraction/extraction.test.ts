import { describe, expect, it } from "vitest";
import {
  candidateFromSpan,
  detectAmbiguities,
  extractInstructions,
  segmentSentences,
  validateCandidate,
} from "./index";

const WOUND_CARE = [
  "Keep the dressing dry for 48 hours.",
  "After 48 hours, gently wash the area with mild soap and water once daily.",
  "Do not soak the wound in a bath or pool for two weeks.",
  "Call your care team if you notice increasing redness, swelling, or fever above 38°C.",
  "Take the prescribed pain medication as directed, but do not exceed four doses in 24 hours.",
].join(" ");

describe("segmentSentences", () => {
  it("preserves exact character offsets for multi-sentence text", () => {
    const source = "Keep dry for 48 hours. Do not soak the wound.";
    const sentences = segmentSentences(source);

    expect(sentences).toHaveLength(2);
    for (const s of sentences) {
      expect(source.slice(s.span.start, s.span.end)).toBe(s.text);
    }
    expect(sentences[0]?.text).toBe("Keep dry for 48 hours.");
    expect(sentences[1]?.text).toBe("Do not soak the wound.");
    expect(sentences[0]?.span).toEqual({ start: 0, end: 22 });
    expect(sentences[1]?.span).toEqual({ start: 23, end: 45 });
  });

  it("handles terminal punctuation clusters", () => {
    const source = "Really?! Call your doctor.";
    const sentences = segmentSentences(source);
    expect(sentences).toHaveLength(2);
    expect(sentences[0]?.text).toBe("Really?!");
    expect(source.slice(sentences[0]!.span.start, sentences[0]!.span.end)).toBe("Really?!");
    expect(sentences[1]?.text).toBe("Call your doctor.");
  });

  it("segments on line breaks without requiring punctuation", () => {
    const source = "Take one tablet every morning\nAvoid grapefruit juice";
    const sentences = segmentSentences(source);
    expect(sentences).toHaveLength(2);
    expect(sentences[0]?.text).toBe("Take one tablet every morning");
    expect(sentences[1]?.text).toBe("Avoid grapefruit juice");
    expect(source.slice(sentences[0]!.span.start, sentences[0]!.span.end)).toBe(
      sentences[0]!.text,
    );
    expect(source.slice(sentences[1]!.span.start, sentences[1]!.span.end)).toBe(
      sentences[1]!.text,
    );
  });

  it("keeps offsets stable across blank lines", () => {
    const source = "First sentence.\n\nSecond sentence.";
    const sentences = segmentSentences(source);
    expect(sentences).toHaveLength(2);
    for (const s of sentences) {
      expect(source.slice(s.span.start, s.span.end)).toBe(s.text);
    }
  });
});

describe("extractInstructions", () => {
  it("extracts multiple tasks with rule IDs, spans, and evidence", () => {
    const result = extractInstructions(WOUND_CARE);

    expect(result.sentences.length).toBeGreaterThanOrEqual(4);
    expect(result.candidates.length).toBeGreaterThanOrEqual(4);

    const types = new Set(result.candidates.map((c) => c.type));
    expect(types.has("wound_care")).toBe(true);
    expect(types.has("activity_restriction") || types.has("wound_care")).toBe(true);
    expect(types.has("contact_care_team")).toBe(true);
    expect(types.has("medication")).toBe(true);

    for (const c of result.candidates) {
      expect(c.ruleId).toMatch(/^R-/);
      expect(c.evidence).toBe(result.source.slice(c.span.start, c.span.end));
      expect(c.warnings.every((w) => typeof w.code === "string")).toBe(true);
    }
  });

  it("flags unresolved references such as “as directed”", () => {
    const source = "Take the prescribed pain medication as directed.";
    const result = extractInstructions(source);
    expect(result.candidates.length).toBe(1);
    const codes = result.candidates[0]!.warnings.map((w) => w.code);
    expect(codes).toContain("unresolved_reference");
  });

  it("flags ambiguous dates / missing concrete dates", () => {
    const source = "Schedule a blood test soon.";
    const result = extractInstructions(source);
    expect(result.candidates.length).toBe(1);
    const codes = result.candidates[0]!.warnings.map((w) => w.code);
    expect(codes).toContain("missing_date");
  });

  it("flags ambiguous timing language", () => {
    const source = "Check the wound periodically.";
    const result = extractInstructions(source);
    expect(result.candidates.length).toBe(1);
    const codes = result.candidates[0]!.warnings.map((w) => w.code);
    expect(codes).toContain("ambiguous_timing");
  });

  it("flags unsupported instructional sentences that match no rule", () => {
    const source = "You should definitely vibe with the healing energy.";
    const result = extractInstructions(source);
    expect(result.candidates).toHaveLength(0);
    expect(result.warnings.some((w) => w.code === "unsupported_assumption")).toBe(true);
  });

  it("does not invent clinical recommendations beyond rule matches", () => {
    const source = "The weather is nice today.";
    const result = extractInstructions(source);
    expect(result.candidates).toHaveLength(0);
    expect(result.warnings).toHaveLength(0);
  });
});

describe("validateCandidate", () => {
  it("accepts candidates whose evidence equals the source substring", () => {
    const source = "Do not soak the wound.";
    const result = extractInstructions(source);
    const c = result.candidates[0]!;
    expect(validateCandidate(source, c)).toEqual([]);
  });

  it("flags invalid offsets that fall outside the source", () => {
    const source = "Take one tablet daily.";
    const bad = candidateFromSpan(source, {
      id: "task-bad-offset",
      ruleId: "R-MED-01",
      type: "medication",
      title: "bad",
      span: { start: 0, end: source.length + 10 },
      evidence: source,
      sentenceId: "s1",
    });
    const codes = bad.warnings.map((w) => w.code);
    expect(codes).toContain("invalid_offset");
  });

  it("flags missing / mismatched evidence for in-bounds offsets", () => {
    const source = "Take one tablet daily.";
    const bad = candidateFromSpan(source, {
      id: "task-bad-evidence",
      ruleId: "R-MED-01",
      type: "medication",
      title: "bad",
      span: { start: 0, end: source.length },
      evidence: "NOT THE SOURCE TEXT",
      sentenceId: "s1",
    });
    const codes = bad.warnings.map((w) => w.code);
    expect(codes).toContain("missing_evidence");
  });

  it("flags negative and inverted spans as invalid_offset", () => {
    const source = "Keep the dressing dry.";
    const negative = validateCandidate(source, {
      id: "t1",
      ruleId: "R-WOUND-01",
      type: "wound_care",
      title: "x",
      evidence: "x",
      span: { start: -1, end: 5 },
      sentenceId: "s1",
      warnings: [],
    });
    expect(negative.map((w) => w.code)).toContain("invalid_offset");

    const inverted = validateCandidate(source, {
      id: "t2",
      ruleId: "R-WOUND-01",
      type: "wound_care",
      title: "x",
      evidence: "x",
      span: { start: 10, end: 3 },
      sentenceId: "s1",
      warnings: [],
    });
    expect(inverted.map((w) => w.code)).toContain("invalid_offset");
  });
});

describe("detectAmbiguities", () => {
  it("returns empty when wording is concrete", () => {
    expect(detectAmbiguities("Keep the dressing dry for 48 hours.")).toEqual([]);
  });

  it("attaches the provided span to warnings", () => {
    const span = { start: 0, end: 20 };
    const warnings = detectAmbiguities("Follow up soon.", span);
    expect(warnings.length).toBeGreaterThan(0);
    expect(warnings.every((w) => w.span?.start === 0 && w.span.end === 20)).toBe(true);
  });
});
