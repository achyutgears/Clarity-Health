// SYNTHETIC DATA — fabricated for interface development. Not real patients, not clinical guidance.

export type TaskStatus = "pending" | "accepted" | "rejected" | "edited";

export interface ExampleInstruction {
  id: string;
  title: string;
  text: string;
}

export const exampleInstructions: ExampleInstruction[] = [
  {
    id: "ex-1",
    title: "Post-procedure wound care (synthetic)",
    text: "Keep the dressing dry for 48 hours. After 48 hours, gently wash the area with mild soap and water once daily. Do not soak the wound in a bath or pool for two weeks. Call your care team if you notice increasing redness, swelling, or fever above 38°C. Take the prescribed pain medication as directed, but do not exceed four doses in 24 hours.",
  },
  {
    id: "ex-2",
    title: "Medication schedule (synthetic)",
    text: "Take one tablet every morning with food. Avoid grapefruit juice while on this medication. If you miss a dose, take it as soon as you remember unless it is almost time for the next dose. Do not take two doses at once. Schedule a blood test in 4 weeks.",
  },
  {
    id: "ex-3",
    title: "Pre-imaging preparation (synthetic)",
    text: "Do not eat anything for six hours before your appointment. You may drink small sips of water. Remove all metal jewelry before arriving. Bring a list of your current medications. Arrive 30 minutes early to complete paperwork.",
  },
];

export interface ActivityItem {
  id: string;
  label: string;
  area: "instructions" | "evidence" | "visual-check" | "reliability";
  when: string;
}

export const syntheticActivity: ActivityItem[] = [
  { id: "a1", label: "Draft opened: Post-procedure wound care", area: "instructions", when: "Sample entry" },
  { id: "a2", label: "Test suite created: Negation handling", area: "reliability", when: "Sample entry" },
  { id: "a3", label: "Evidence graph prepared for example 2", area: "evidence", when: "Sample entry" },
];

export type ExpectedLabel = "action" | "prohibition" | "warning" | "timing";

export interface TestCase {
  id: string;
  sentence: string;
  expected: ExpectedLabel;
}

export const syntheticTestCases: TestCase[] = [
  { id: "T-001", sentence: "Keep the dressing dry for 48 hours.", expected: "timing" },
  { id: "T-002", sentence: "Do not soak the wound in a bath.", expected: "prohibition" },
  { id: "T-003", sentence: "Call your care team if you develop a fever.", expected: "warning" },
  { id: "T-004", sentence: "Take one tablet every morning with food.", expected: "action" },
  { id: "T-005", sentence: "Avoid grapefruit juice while on this medication.", expected: "prohibition" },
  { id: "T-006", sentence: "Never drive after taking this medicine.", expected: "prohibition" },
  { id: "T-007", sentence: "Seek emergency care if bleeding does not stop.", expected: "warning" },
  { id: "T-008", sentence: "Bring a list of your current medications.", expected: "action" },
  { id: "T-009", sentence: "Arrive 30 minutes early to complete paperwork.", expected: "timing" },
  { id: "T-010", sentence: "Remove all metal jewelry before arriving.", expected: "action" },
];
