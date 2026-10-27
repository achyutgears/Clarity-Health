import { shuffle, uniqueById, type Rng } from "./random";

export type TeaserKind = "word" | "pattern" | "logic" | "visual";

export const TEASER_KIND_LABELS: Record<TeaserKind, string> = {
  word: "Word puzzle",
  pattern: "Number pattern",
  logic: "Logic",
  visual: "Visual match",
};

export interface TeaserOption {
  /** Text name, always shown and used as the accessible label. */
  label: string;
  /** Optional large symbol (emoji) shown above the label. */
  symbol?: string;
}

interface TeaserBase {
  id: string;
  kind: TeaserKind;
  prompt: string;
  /** Optional large display line, e.g. scrambled letters or a sequence. */
  display?: string;
  hint: string;
  explanation: string;
}

export interface TextTeaser extends TeaserBase {
  type: "text";
  /** Answer shown when the player asks to see it. */
  canonicalAnswer: string;
  /** Every accepted answer; compared after normalization. */
  acceptedAnswers: readonly string[];
}

export interface ChoiceTeaser extends TeaserBase {
  type: "choice";
  options: readonly TeaserOption[];
  answerIndex: number;
}

export type Teaser = TextTeaser | ChoiceTeaser;

export const TEASERS: readonly Teaser[] = [
  {
    id: "word-peace",
    kind: "word",
    type: "text",
    prompt: "Unscramble these letters to make a calm word.",
    display: "E · C · A · P · E",
    canonicalAnswer: "peace",
    acceptedAnswers: ["peace"],
    hint: "It’s how a quiet morning can feel. It starts with P.",
    explanation: "E, C, A, P, E rearranges to PEACE.",
  },
  {
    id: "word-water",
    kind: "word",
    type: "text",
    prompt: "Unscramble these letters to find something you might drink.",
    display: "R · E · T · A · W",
    canonicalAnswer: "water",
    acceptedAnswers: ["water"],
    hint: "It comes out of a tap. It starts with W.",
    explanation: "R, E, T, A, W rearranges to WATER.",
  },
  {
    id: "riddle-piano",
    kind: "word",
    type: "text",
    prompt: "I have lots of keys but can’t open a single lock, and I can play music. What am I?",
    canonicalAnswer: "a piano",
    acceptedAnswers: ["piano", "keyboard", "grand piano", "upright piano", "electric keyboard"],
    hint: "You press my black and white keys to play a tune.",
    explanation:
      "A piano (or a musical keyboard) has keys, but they make music instead of opening locks.",
  },
  {
    id: "riddle-towel",
    kind: "word",
    type: "text",
    prompt: "What gets wetter the more it dries?",
    canonicalAnswer: "a towel",
    acceptedAnswers: ["towel", "bath towel", "hand towel", "beach towel"],
    hint: "You reach for it after a shower.",
    explanation: "A towel soaks up water as it dries you, so it gets wetter the more it dries.",
  },
  {
    id: "pattern-doubling",
    kind: "pattern",
    type: "text",
    prompt: "What number comes next?",
    display: "2, 4, 8, 16, ?",
    canonicalAnswer: "32",
    acceptedAnswers: ["32", "thirty two", "thirtytwo"],
    hint: "Look at how each number compares to the one before it.",
    explanation: "Each number is double the one before it, so 16 × 2 = 32.",
  },
  {
    id: "pattern-squares",
    kind: "pattern",
    type: "text",
    prompt: "What number comes next?",
    display: "1, 4, 9, 16, 25, ?",
    canonicalAnswer: "36",
    acceptedAnswers: ["36", "thirty six", "thirtysix"],
    hint: "Try 1 × 1, 2 × 2, 3 × 3…",
    explanation: "These are square numbers: 1², 2², 3², 4², 5², so next is 6 × 6 = 36.",
  },
  {
    id: "pattern-days",
    kind: "pattern",
    type: "choice",
    prompt: "Which day comes next in this pattern?",
    display: "Mon, Wed, Fri, ?",
    options: [{ label: "Sat" }, { label: "Sun" }, { label: "Mon" }, { label: "Thu" }],
    answerIndex: 1,
    hint: "The pattern skips one day each time.",
    explanation: "Each step skips a day: Mon → Wed → Fri → Sun.",
  },
  {
    id: "logic-heights",
    kind: "logic",
    type: "choice",
    prompt: "Maya is taller than Leo. Leo is taller than Sam. Who is the shortest?",
    options: [{ label: "Maya" }, { label: "Leo" }, { label: "Sam" }, { label: "Can’t tell" }],
    answerIndex: 2,
    hint: "Try lining them up from tallest to shortest.",
    explanation: "From tallest to shortest the order is Maya, Leo, Sam, so Sam is the shortest.",
  },
  {
    id: "logic-sheep",
    kind: "logic",
    type: "text",
    prompt: "A farmer has 5 sheep. All but 2 wander off. How many sheep are left?",
    canonicalAnswer: "2",
    acceptedAnswers: ["2", "two", "2 sheep", "two sheep"],
    hint: "Read “all but 2” slowly.",
    explanation: "“All but 2” wandered off, which means 2 sheep stayed behind.",
  },
  {
    id: "logic-tomorrow",
    kind: "logic",
    type: "choice",
    prompt: "If yesterday was Tuesday, what day will tomorrow be?",
    options: [
      { label: "Wednesday" },
      { label: "Thursday" },
      { label: "Friday" },
      { label: "Monday" },
    ],
    answerIndex: 1,
    hint: "First work out what day it is today.",
    explanation: "If yesterday was Tuesday, today is Wednesday, so tomorrow is Thursday.",
  },
  {
    id: "visual-odd-food",
    kind: "visual",
    type: "choice",
    prompt: "Which one is the odd one out?",
    options: [
      { symbol: "🍎", label: "Apple" },
      { symbol: "🍌", label: "Banana" },
      { symbol: "🥕", label: "Carrot" },
      { symbol: "🍇", label: "Grapes" },
    ],
    answerIndex: 2,
    hint: "Three of these grow as fruit.",
    explanation: "Apples, bananas and grapes are fruits. A carrot is a root vegetable.",
  },
  {
    id: "visual-pair",
    kind: "visual",
    type: "choice",
    prompt: "A bee gives us honey. Which one does a cow give us?",
    display: "🐝 → 🍯   ·   🐄 → ?",
    options: [
      { symbol: "🥚", label: "Egg" },
      { symbol: "🥛", label: "Milk" },
      { symbol: "🌽", label: "Corn" },
      { symbol: "🐟", label: "Fish" },
    ],
    answerIndex: 1,
    hint: "You might pour it on cereal.",
    explanation: "Bees make honey and cows give milk. Eggs come from hens.",
  },
];

const ARTICLES = new Set(["a", "an", "the"]);

/** Lowercases, trims, strips punctuation and leading/inner articles, and collapses spaces. */
export function normalizeAnswer(raw: string): string {
  return raw
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[-_/]+/g, " ")
    .replace(/[^\p{L}\p{N}\s]/gu, "")
    .split(/\s+/)
    .filter((w) => w.length > 0 && !ARTICLES.has(w))
    .join(" ")
    .trim();
}

/** True when `answer` solves the teaser. Text answers are normalized; choices compare indexes. */
export function checkTeaserAnswer(teaser: Teaser, answer: string | number): boolean {
  if (teaser.type === "choice") {
    return typeof answer === "number" && answer === teaser.answerIndex;
  }
  if (typeof answer !== "string") return false;
  const given = normalizeAnswer(answer);
  if (!given) return false;
  return teaser.acceptedAnswers.some((a) => normalizeAnswer(a) === given);
}

/** Text shown when the player chooses "Show answer". */
export function teaserAnswerText(teaser: Teaser): string {
  if (teaser.type === "text") return teaser.canonicalAnswer;
  const opt = teaser.options[teaser.answerIndex];
  if (!opt) return "";
  return opt.symbol ? `${opt.symbol} ${opt.label}` : opt.label;
}

// ---------------------------------------------------------------------------
// Rounds

export const TEASER_ROUND_SIZE = 5;

export interface TeaserResult {
  attempts: number;
  solved: boolean;
  revealed: boolean;
  hintUsed: boolean;
  /** Choice indexes already tried (choice teasers only). */
  tried: number[];
}

export interface TeaserRound {
  items: Teaser[];
  index: number;
  results: TeaserResult[];
}

const emptyResult = (): TeaserResult => ({
  attempts: 0,
  solved: false,
  revealed: false,
  hintUsed: false,
  tried: [],
});

export function createTeaserRound(
  teasers: readonly Teaser[],
  { size = TEASER_ROUND_SIZE, rng = Math.random }: { size?: number; rng?: Rng } = {},
): TeaserRound {
  const pool = uniqueById(teasers);
  const n = Math.max(0, Math.min(Math.floor(size), pool.length));
  const items = shuffle(pool, rng).slice(0, n);
  return { items, index: 0, results: items.map(emptyResult) };
}

export function currentTeaser(round: TeaserRound): Teaser | null {
  return round.items[round.index] ?? null;
}

export function currentResult(round: TeaserRound): TeaserResult | null {
  return round.results[round.index] ?? null;
}

/** A teaser is finished once solved or its answer has been revealed. */
export function isTeaserDone(result: TeaserResult | null): boolean {
  return !!result && (result.solved || result.revealed);
}

function updateCurrent(round: TeaserRound, fn: (r: TeaserResult) => TeaserResult): TeaserRound {
  const r = currentResult(round);
  if (!r) return round;
  const results = round.results.slice();
  results[round.index] = fn(r);
  return { ...round, results };
}

/** Checks an attempt. Unlimited tries; ignored once the teaser is finished or the input is blank. */
export function submitTeaserAnswer(
  round: TeaserRound,
  answer: string | number,
): { round: TeaserRound; correct: boolean } {
  const t = currentTeaser(round);
  const r = currentResult(round);
  if (!t || !r || isTeaserDone(r)) return { round, correct: false };
  if (typeof answer === "string" && normalizeAnswer(answer) === "")
    return { round, correct: false };
  const correct = checkTeaserAnswer(t, answer);
  const next = updateCurrent(round, (prev) => ({
    ...prev,
    attempts: prev.attempts + 1,
    solved: correct,
    tried:
      typeof answer === "number" && !prev.tried.includes(answer)
        ? [...prev.tried, answer]
        : prev.tried,
  }));
  return { round: next, correct };
}

export function showTeaserHint(round: TeaserRound): TeaserRound {
  return updateCurrent(round, (r) => ({ ...r, hintUsed: true }));
}

export function revealTeaserAnswer(round: TeaserRound): TeaserRound {
  return updateCurrent(round, (r) => (isTeaserDone(r) ? r : { ...r, revealed: true }));
}

export function nextTeaser(round: TeaserRound): TeaserRound {
  if (isRoundComplete(round) || !isTeaserDone(currentResult(round))) return round;
  return { ...round, index: round.index + 1 };
}

export function isRoundComplete(round: TeaserRound): boolean {
  return round.index >= round.items.length;
}

export interface RoundSummary {
  total: number;
  solved: number;
  solvedWithoutHint: number;
  revealed: number;
}

export function summarizeRound(round: TeaserRound): RoundSummary {
  return round.results.reduce<RoundSummary>(
    (s, r) => ({
      total: s.total + 1,
      solved: s.solved + (r.solved ? 1 : 0),
      solvedWithoutHint: s.solvedWithoutHint + (r.solved && !r.hintUsed ? 1 : 0),
      revealed: s.revealed + (r.revealed ? 1 : 0),
    }),
    { total: 0, solved: 0, solvedWithoutHint: 0, revealed: 0 },
  );
}
