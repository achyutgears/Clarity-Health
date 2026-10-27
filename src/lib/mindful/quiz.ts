import type { QuizCategory, QuizQuestion } from "./quiz-questions";
import { shuffle, uniqueById, type Rng } from "./random";

export interface SessionQuestion {
  id: string;
  category: QuizCategory;
  prompt: string;
  /** Choices in the order shown for this session. */
  choices: string[];
  /** Index of the correct answer within the shuffled `choices`. */
  answerIndex: number;
  explanation: string;
}

export interface QuizSession {
  questions: SessionQuestion[];
  /** Index of the question being shown; equals questions.length once finished. */
  current: number;
  /** Chosen choice index per question, or null if not answered yet. */
  answers: (number | null)[];
}

export interface QuizOptions {
  count?: number;
  rng?: Rng;
}

export const DEFAULT_QUIZ_LENGTH = 10;

/**
 * Builds a fresh session: picks up to `count` distinct questions in random order and shuffles
 * each question's choices while keeping track of where the correct answer moved.
 */
export function createQuizSession(
  questions: readonly QuizQuestion[],
  { count = DEFAULT_QUIZ_LENGTH, rng = Math.random }: QuizOptions = {},
): QuizSession {
  const pool = uniqueById(questions);
  const size = Math.max(0, Math.min(Math.floor(count), pool.length));
  const picked = shuffle(pool, rng).slice(0, size);

  const sessionQuestions = picked.map((q): SessionQuestion => {
    const order = shuffle(
      q.choices.map((_, i) => i),
      rng,
    );
    return {
      id: q.id,
      category: q.category,
      prompt: q.prompt,
      choices: order.map((i) => q.choices[i] as string),
      answerIndex: order.indexOf(q.answerIndex),
      explanation: q.explanation,
    };
  });

  return {
    questions: sessionQuestions,
    current: 0,
    answers: sessionQuestions.map(() => null),
  };
}

export function currentQuestion(session: QuizSession): SessionQuestion | null {
  return session.questions[session.current] ?? null;
}

export function currentAnswer(session: QuizSession): number | null {
  return session.answers[session.current] ?? null;
}

export function isAnswered(session: QuizSession): boolean {
  return currentAnswer(session) !== null;
}

/** Records an answer for the current question. Ignored if already answered or out of range. */
export function answer(session: QuizSession, choiceIndex: number): QuizSession {
  const q = currentQuestion(session);
  if (!q || isAnswered(session)) return session;
  if (!Number.isInteger(choiceIndex) || choiceIndex < 0 || choiceIndex >= q.choices.length) {
    return session;
  }
  const answers = session.answers.slice();
  answers[session.current] = choiceIndex;
  return { ...session, answers };
}

/** Moves to the next question. Only advances once the current question has an answer. */
export function next(session: QuizSession): QuizSession {
  if (isComplete(session) || !isAnswered(session)) return session;
  return { ...session, current: session.current + 1 };
}

export function isCorrect(session: QuizSession, index = session.current): boolean | null {
  const q = session.questions[index];
  const a = session.answers[index];
  if (!q || a === null || a === undefined) return null;
  return a === q.answerIndex;
}

export function score(session: QuizSession): number {
  return session.questions.reduce(
    (total, q, i) => (session.answers[i] === q.answerIndex ? total + 1 : total),
    0,
  );
}

export function isComplete(session: QuizSession): boolean {
  return session.current >= session.questions.length;
}

export function isLastQuestion(session: QuizSession): boolean {
  return session.current === session.questions.length - 1;
}

/** A gentle, non-judgmental line for the completion screen. */
export function completionMessage(correct: number, total: number): string {
  if (total === 0) return "Thanks for playing.";
  if (correct === total) return "Every one! Thanks for spending a few minutes here.";
  if (correct === 0)
    return "Every question is a chance to learn something new. Thanks for playing.";
  return "Hopefully you picked up a fun fact or two. Thanks for playing.";
}
