import { describe, expect, it } from "vitest";
import { seededRng } from "./random";
import {
  TEASERS,
  checkTeaserAnswer,
  createTeaserRound,
  currentTeaser,
  isRoundComplete,
  nextTeaser,
  normalizeAnswer,
  revealTeaserAnswer,
  showTeaserHint,
  submitTeaserAnswer,
  summarizeRound,
  teaserAnswerText,
  type Teaser,
} from "./teasers";

const wrongAnswerFor = (t: Teaser): string | number =>
  t.type === "choice" ? (t.answerIndex + 1) % t.options.length : "definitely not it";

const rightAnswerFor = (t: Teaser): string | number =>
  t.type === "choice" ? t.answerIndex : t.canonicalAnswer;

describe("teaser bank", () => {
  it("has 9 to 12 teasers with unique ids covering every kind", () => {
    expect(TEASERS.length).toBeGreaterThanOrEqual(9);
    expect(TEASERS.length).toBeLessThanOrEqual(12);
    expect(new Set(TEASERS.map((t) => t.id)).size).toBe(TEASERS.length);
    expect(new Set(TEASERS.map((t) => t.kind))).toEqual(
      new Set(["word", "pattern", "logic", "visual"]),
    );
  });

  it.each(TEASERS.map((t) => [t.id, t] as const))("%s accepts its answers only", (_id, t) => {
    expect(t.hint.trim()).not.toBe("");
    expect(t.explanation.trim()).not.toBe("");
    expect(checkTeaserAnswer(t, rightAnswerFor(t))).toBe(true);
    expect(checkTeaserAnswer(t, wrongAnswerFor(t))).toBe(false);
    if (t.type === "text") {
      for (const a of t.acceptedAnswers) expect(checkTeaserAnswer(t, a)).toBe(true);
      expect(checkTeaserAnswer(t, `  ${t.canonicalAnswer.toUpperCase()}!  `)).toBe(true);
      expect(checkTeaserAnswer(t, "")).toBe(false);
      expect(checkTeaserAnswer(t, 0)).toBe(false);
    } else {
      expect(t.options.length).toBeGreaterThanOrEqual(3);
      expect(new Set(t.options.map((o) => o.label)).size).toBe(t.options.length);
      expect(t.answerIndex).toBeGreaterThanOrEqual(0);
      expect(t.answerIndex).toBeLessThan(t.options.length);
      expect(checkTeaserAnswer(t, String(t.answerIndex))).toBe(false);
    }
    expect(teaserAnswerText(t).length).toBeGreaterThan(0);
  });
});

describe("normalizeAnswer", () => {
  it("lowercases, trims, strips punctuation and articles", () => {
    expect(normalizeAnswer("  The Towel! ")).toBe("towel");
    expect(normalizeAnswer("A piano.")).toBe("piano");
    expect(normalizeAnswer("thirty-two")).toBe("thirty two");
    expect(normalizeAnswer("an   apple")).toBe("apple");
    expect(normalizeAnswer("?!")).toBe("");
  });
});

describe("teaser rounds", () => {
  it("creates rounds of 5 distinct teasers, deterministic by seed", () => {
    const a = createTeaserRound(TEASERS, { rng: seededRng(8) });
    const b = createTeaserRound(TEASERS, { rng: seededRng(8) });
    expect(a.items).toHaveLength(5);
    expect(new Set(a.items.map((t) => t.id)).size).toBe(5);
    expect(a).toEqual(b);
  });

  it("allows unlimited tries, then solves and advances", () => {
    let round = createTeaserRound(TEASERS, { size: 2, rng: seededRng(1) });
    const t = currentTeaser(round)!;
    for (let i = 0; i < 3; i++) {
      const r = submitTeaserAnswer(round, wrongAnswerFor(t));
      expect(r.correct).toBe(false);
      round = r.round;
    }
    expect(nextTeaser(round)).toBe(round);
    const solved = submitTeaserAnswer(round, rightAnswerFor(t));
    expect(solved.correct).toBe(true);
    round = solved.round;
    expect(round.results[0]?.attempts).toBe(4);
    expect(round.results[0]?.solved).toBe(true);
    // Further attempts are ignored once solved.
    expect(submitTeaserAnswer(round, wrongAnswerFor(t)).round).toBe(round);
    round = nextTeaser(round);
    expect(round.index).toBe(1);
  });

  it("ignores blank text attempts", () => {
    const round = createTeaserRound(
      TEASERS.filter((t) => t.type === "text"),
      { size: 1, rng: seededRng(2) },
    );
    const r = submitTeaserAnswer(round, "   ");
    expect(r.correct).toBe(false);
    expect(r.round).toBe(round);
  });

  it("tracks hints and reveals, and summarizes the round", () => {
    let round = createTeaserRound(TEASERS, { size: 3, rng: seededRng(3) });
    // 1: solved without hint
    round = submitTeaserAnswer(round, rightAnswerFor(currentTeaser(round)!)).round;
    round = nextTeaser(round);
    // 2: hint then solved
    round = showTeaserHint(round);
    round = submitTeaserAnswer(round, rightAnswerFor(currentTeaser(round)!)).round;
    round = nextTeaser(round);
    // 3: revealed
    round = revealTeaserAnswer(round);
    expect(submitTeaserAnswer(round, rightAnswerFor(currentTeaser(round)!)).correct).toBe(false);
    round = nextTeaser(round);

    expect(isRoundComplete(round)).toBe(true);
    expect(summarizeRound(round)).toEqual({
      total: 3,
      solved: 2,
      solvedWithoutHint: 1,
      revealed: 1,
    });
  });
});
