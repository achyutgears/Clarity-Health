/**
 * Explainable, deterministic extraction rules for a limited task vocabulary.
 * Rule order matters: first matching rule wins per sentence.
 */
import type { ExtractionRule } from "./types";

function trimTitle(text: string, max = 120): string {
  const t = text.trim().replace(/\s+/g, " ");
  return t.length <= max ? t : `${t.slice(0, max - 1)}…`;
}

export const EXTRACTION_RULES: readonly ExtractionRule[] = [
  {
    id: "R-CONTACT-01",
    type: "contact_care_team",
    pattern:
      /\b(call|contact|seek|notify)\b[\s\S]{0,80}\b(care team|doctor|provider|physician|nurse|emergency|er)\b/i,
    title: (s) => trimTitle(s),
  },
  {
    id: "R-LAB-01",
    type: "lab_or_test",
    pattern: /\b(blood test|lab(?:oratory)?(?:\s+work)?|imaging|x-?ray|mri|ct scan|ultrasound)\b/i,
    title: (s) => trimTitle(s),
  },
  {
    id: "R-APPT-01",
    type: "appointment",
    pattern: /\b(schedule|appointment|follow[- ]?up visit|arrive)\b/i,
    title: (s) => trimTitle(s),
  },
  {
    id: "R-MED-01",
    type: "medication",
    pattern:
      /\b(take|taking)\b[\s\S]{0,60}\b(tablet|pill|capsule|dose|doses|medication|medicine|prescribed)\b/i,
    title: (s) => trimTitle(s),
  },
  {
    id: "R-WOUND-01",
    type: "wound_care",
    pattern: /\b(dressing|wound|incision|stitch(?:es)?|suture)\b/i,
    title: (s) => trimTitle(s),
  },
  {
    id: "R-DIET-01",
    type: "dietary_restriction",
    pattern:
      /\b(do not eat|don't eat|avoid)\b[\s\S]{0,40}\b(food|juice|grapefruit|alcohol|dairy)\b|\b(eat|drink)\b[\s\S]{0,40}\b(nothing|anything|water|food)\b/i,
    title: (s) => trimTitle(s),
  },
  {
    id: "R-RESTRICT-01",
    type: "activity_restriction",
    pattern: /\b(do not|don't|avoid|never)\b/i,
    title: (s) => trimTitle(s),
  },
  {
    id: "R-CARE-01",
    type: "general_care",
    pattern:
      /\b(keep|wash|remove|bring|rest|elevate|apply|monitor|check)\b/i,
    title: (s) => trimTitle(s),
  },
] as const;

/** Sentences that look instructional but match no supported rule. */
export const UNSUPPORTED_HINT =
  /\b(should|must|need to|remember to|make sure|be sure)\b/i;
