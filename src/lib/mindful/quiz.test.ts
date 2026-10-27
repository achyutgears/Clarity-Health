import { describe, expect, it } from "vitest";
import { QUIZ_QUESTIONS, type QuizCategory } from "./quiz-questions";
import {
  answer,
  completionMessage,
  createQuizSession,
  currentQuestion,
  isComplete,
  isCorrect,
  next,
  score,
} from "./quiz";
import { seededRng } from "./random";

describe("quiz question bank", () => {
  it("has at least 24 questions with unique ids", () => {
    expect(QUIZ_QUESTIONS.length).toBeGreaterThanOrEqual(24);
    const ids = new Set(QUIZ_QUESTIONS.map((q) => q.id));
    expect(ids.size).toBe(QUIZ_QUESTIONS.length);
  });

  it("has at least 4 questions in every category", () => {
    const counts: Record<QuizCategory, number> = {
      general: 0,
      nature: 0,
      animals: 0,
      science: 0,
      space: 0,
    };
    for (const q of QUIZ_QUESTIONS) counts[q.category]++;
    for (const n of Object.values(counts)) expect(n).toBeGreaterThanOrEqual(4);
  });

  it.each(QUIZ_QUESTIONS.map((q) => [q.id, q] as const))(
    "%s has 4 unique choices, a valid answer and an explanation",
    (_id, q) => {
      expect(q.choices).toHaveLength(4);
      expect(new Set(q.choices.map((c) => c.trim().toLowerCase())).size).toBe(4);
      expect(Number.isInteger(q.answerIndex)).toBe(true);
      expect(q.answerIndex).toBeGreaterThanOrEqual(0);
      expect(q.answerIndex).toBeLessThan(4);
      expect(q.prompt.trim().length).toBeGreaterThan(0);
      expect(q.explanation.trim().length).toBeGreaterThan(0);
    },
  );
});

describe("createQuizSession", () => {
  it("defaults to 10 questions with no duplicate ids", () => {
    const s = createQuizSession(QUIZ_QUESTIONS, { rng: seededRng(1) });
    expect(s.questions).toHaveLength(10);
    expect(new Set(s.questions.map((q) => q.id)).size).toBe(10);
    expect(s.current).toBe(0);
    expect(s.answers.every((a) => a === null)).toBe(true);
  });

  it("drops duplicate ids from the input pool", () => {
    const first = QUIZ_QUESTIONS[0]!;
    const pool = [first, first, first, QUIZ_QUESTIONS[1]!];
    const s = createQuizSession(pool, { count: 10, rng: seededRng(3) });
    expect(s.questions).toHaveLength(2);
    expect(new Set(s.questions.map((q) => q.id)).size).toBe(2);
  });

  it("is deterministic for the same seed and differs across seeds", () => {
    const a = createQuizSession(QUIZ_QUESTIONS, { rng: seededRng(42) });
    const b = createQuizSession(QUIZ_QUESTIONS, { rng: seededRng(42) });
    const c = createQuizSession(QUIZ_QUESTIONS, { rng: seededRng(7) });
    expect(a).toEqual(b);
    expect(a.questions.map((q) => q.id)).not.toEqual(c.questions.map((q) => q.id));
  });

  it("keeps the correct answer text after shuffling choices", () => {
    const s = createQuizSession(QUIZ_QUESTIONS, {
      count: QUIZ_QUESTIONS.length,
      rng: seededRng(9),
    });
    for (const sq of s.questions) {
      const original = QUIZ_QUESTIONS.find((q) => q.id === sq.id)!;
      expect(sq.choices).toHaveLength(4);
      expect([...sq.choices].sort()).toEqual([...original.choices].sort());
      expect(sq.choices[sq.answerIndex]).toBe(original.choices[original.answerIndex]);
    }
  });

  it("clamps count to the pool size", () => {
    const s = createQuizSession(QUIZ_QUESTIONS.slice(0, 3), { count: 10 });
    expect(s.questions).toHaveLength(3);
  });
});

describe("answering and scoring", () => {
  it("scores correct answers and ignores re-answering", () => {
    let s = createQuizSession(QUIZ_QUESTIONS, { count: 3, rng: seededRng(5) });
    const q0 = currentQuestion(s)!;
    s = answer(s, q0.answerIndex);
    expect(isCorrect(s)).toBe(true);
    const wrongForQ0 = (q0.answerIndex + 1) % 4;
    s = answer(s, wrongForQ0);
    expect(s.answers[0]).toBe(q0.answerIndex);
    s = next(s);

    const q1 = currentQuestion(s)!;
    s = answer(s, (q1.answerIndex + 1) % 4);
    expect(isCorrect(s)).toBe(false);
    s = next(s);

    const q2 = currentQuestion(s)!;
    s = answer(s, q2.answerIndex);
    expect(score(s)).toBe(2);
  });

  it("ignores out-of-range choices", () => {
    const s = createQuizSession(QUIZ_QUESTIONS, { count: 2, rng: seededRng(2) });
    expect(answer(s, 4)).toBe(s);
    expect(answer(s, -1)).toBe(s);
    expect(answer(s, 1.5)).toBe(s);
  });

  it("only advances after answering and completes after the last question", () => {
    let s = createQuizSession(QUIZ_QUESTIONS, { count: 2, rng: seededRng(11) });
    expect(next(s)).toBe(s);
    s = next(answer(s, 0));
    expect(s.current).toBe(1);
    expect(isComplete(s)).toBe(false);
    s = next(answer(s, 0));
    expect(isComplete(s)).toBe(true);
    expect(currentQuestion(s)).toBeNull();
    expect(next(s)).toBe(s);
  });

  it("replay creates a fresh, unanswered session", () => {
    let s = createQuizSession(QUIZ_QUESTIONS, { count: 2, rng: seededRng(4) });
    s = next(answer(s, 0));
    s = next(answer(s, 0));
    expect(isComplete(s)).toBe(true);
    const replay = createQuizSession(QUIZ_QUESTIONS, { count: 2, rng: seededRng(5) });
    expect(replay.current).toBe(0);
    expect(score(replay)).toBe(0);
    expect(replay.answers).toEqual([null, null]);
    expect(isComplete(replay)).toBe(false);
  });

  it("phrases completion gently for any score", () => {
    for (const [c, t] of [
      [0, 10],
      [5, 10],
      [10, 10],
      [0, 0],
    ] as const) {
      const msg = completionMessage(c, t);
      expect(msg.length).toBeGreaterThan(0);
      expect(msg.toLowerCase()).not.toMatch(/fail|bad|poor|wrong/);
    }
  });
});
