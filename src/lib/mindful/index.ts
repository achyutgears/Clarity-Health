export * from "./random";
export * from "./quiz-questions";
export * from "./quiz";
export * from "./teasers";
export * from "./breathing";

export type MindfulActivity = "quiz" | "teasers" | "calm";

export const MINDFUL_ACTIVITIES: readonly MindfulActivity[] = ["quiz", "teasers", "calm"];

export function parseMindfulActivity(value: unknown): MindfulActivity | undefined {
  return typeof value === "string" && (MINDFUL_ACTIVITIES as readonly string[]).includes(value)
    ? (value as MindfulActivity)
    : undefined;
}
