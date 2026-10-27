/**
 * Pure timing logic for the Calm Break breathing guide. No timers live here; the UI passes in
 * timestamps (performance.now()) so everything is deterministic and testable.
 */

/** Phase lengths in seconds. */
export interface BreathPattern {
  inhale: number;
  hold: number;
  exhale: number;
}

/** Breathe in 4s, hold 4s, breathe out 6s. */
export const CALM_BREATH_PATTERN: BreathPattern = { inhale: 4, hold: 4, exhale: 6 };

export type BreathPhase = "inhale" | "hold" | "exhale";

export const PHASE_LABELS: Record<BreathPhase, string> = {
  inhale: "Breathe in…",
  hold: "Hold…",
  exhale: "Breathe out…",
};

export const SESSION_MINUTES = [1, 2, 3] as const;
export type SessionMinutes = (typeof SESSION_MINUTES)[number];

export function cycleMs(pattern: BreathPattern = CALM_BREATH_PATTERN): number {
  return (pattern.inhale + pattern.hold + pattern.exhale) * 1000;
}

/** Whole breaths that best fit the chosen length, so a session always ends after an exhale. */
export function sessionCycles(
  minutes: number,
  pattern: BreathPattern = CALM_BREATH_PATTERN,
): number {
  return Math.max(1, Math.round((minutes * 60_000) / cycleMs(pattern)));
}

export function sessionDurationMs(
  minutes: number,
  pattern: BreathPattern = CALM_BREATH_PATTERN,
): number {
  return sessionCycles(minutes, pattern) * cycleMs(pattern);
}

export interface BreathingState {
  phase: BreathPhase;
  phaseDurationMs: number;
  phaseRemainingMs: number;
  /** 0 at the start of the phase, 1 at its end. */
  phaseProgress: number;
  /** 1-based breath number. */
  cycle: number;
  totalCycles: number;
  totalRemainingMs: number;
  /** 0..1 across the whole session. */
  sessionProgress: number;
  complete: boolean;
}

export function breathingStateAt(
  elapsedMs: number,
  totalMs: number,
  pattern: BreathPattern = CALM_BREATH_PATTERN,
): BreathingState {
  const cycle = cycleMs(pattern);
  const total = Math.max(0, totalMs);
  const totalCycles = Math.max(1, Math.ceil(total / cycle));
  const elapsed = Math.min(Math.max(0, elapsedMs), total);
  const inhaleMs = pattern.inhale * 1000;
  const holdMs = pattern.hold * 1000;
  const exhaleMs = pattern.exhale * 1000;

  if (elapsed >= total) {
    return {
      phase: "exhale",
      phaseDurationMs: exhaleMs,
      phaseRemainingMs: 0,
      phaseProgress: 1,
      cycle: totalCycles,
      totalCycles,
      totalRemainingMs: 0,
      sessionProgress: 1,
      complete: true,
    };
  }

  const inCycle = elapsed % cycle;
  let phase: BreathPhase;
  let phaseStart: number;
  let phaseDurationMs: number;
  if (inCycle < inhaleMs) {
    phase = "inhale";
    phaseStart = 0;
    phaseDurationMs = inhaleMs;
  } else if (inCycle < inhaleMs + holdMs) {
    phase = "hold";
    phaseStart = inhaleMs;
    phaseDurationMs = holdMs;
  } else {
    phase = "exhale";
    phaseStart = inhaleMs + holdMs;
    phaseDurationMs = exhaleMs;
  }
  const intoPhase = inCycle - phaseStart;

  return {
    phase,
    phaseDurationMs,
    phaseRemainingMs: phaseDurationMs - intoPhase,
    phaseProgress: phaseDurationMs > 0 ? intoPhase / phaseDurationMs : 1,
    cycle: Math.floor(elapsed / cycle) + 1,
    totalCycles,
    totalRemainingMs: total - elapsed,
    sessionProgress: total > 0 ? elapsed / total : 1,
    complete: false,
  };
}

// ---------------------------------------------------------------------------
// Controller: idle → running ⇄ paused → complete

export type BreathingStatus = "idle" | "running" | "paused" | "complete";

export interface BreathingController {
  status: BreathingStatus;
  totalMs: number;
  /** Time banked from earlier running stretches. */
  accumulatedMs: number;
  /** Timestamp when the current running stretch began; null unless running. */
  startedAt: number | null;
}

export function createBreathingController(totalMs: number): BreathingController {
  return { status: "idle", totalMs, accumulatedMs: 0, startedAt: null };
}

export function breathingElapsedMs(c: BreathingController, now: number): number {
  const live = c.status === "running" && c.startedAt !== null ? Math.max(0, now - c.startedAt) : 0;
  return Math.min(c.totalMs, c.accumulatedMs + live);
}

export function startBreathing(c: BreathingController, now: number): BreathingController {
  if (c.status === "running" || c.status === "paused") return c;
  return { ...c, status: "running", accumulatedMs: 0, startedAt: now };
}

export function pauseBreathing(c: BreathingController, now: number): BreathingController {
  if (c.status !== "running") return c;
  return { ...c, status: "paused", accumulatedMs: breathingElapsedMs(c, now), startedAt: null };
}

export function resumeBreathing(c: BreathingController, now: number): BreathingController {
  if (c.status !== "paused") return c;
  return { ...c, status: "running", startedAt: now };
}

/** Finishes early (or on time) and keeps the time spent. */
export function endBreathing(c: BreathingController, now: number): BreathingController {
  if (c.status !== "running" && c.status !== "paused") return c;
  return { ...c, status: "complete", accumulatedMs: breathingElapsedMs(c, now), startedAt: null };
}

export function resetBreathing(c: BreathingController, totalMs = c.totalMs): BreathingController {
  return createBreathingController(totalMs);
}

/** Marks the session complete once the full duration has elapsed. */
export function tickBreathing(c: BreathingController, now: number): BreathingController {
  if (c.status !== "running") return c;
  if (breathingElapsedMs(c, now) < c.totalMs) return c;
  return { ...c, status: "complete", accumulatedMs: c.totalMs, startedAt: null };
}

// ---------------------------------------------------------------------------
// Circle animation targets

export const CIRCLE_MIN_SCALE = 0.6;
export const CIRCLE_MAX_SCALE = 1;

/**
 * Where the breathing circle should be heading and how long the CSS transition should take.
 * While running, the circle heads for the end-of-phase size over the time left in the phase;
 * while paused it freezes at the size it has reached.
 */
export function circleTarget(
  state: BreathingState,
  status: BreathingStatus,
): { scale: number; durationMs: number } {
  const range = CIRCLE_MAX_SCALE - CIRCLE_MIN_SCALE;
  if (status === "idle" || status === "complete") {
    return { scale: CIRCLE_MIN_SCALE, durationMs: 800 };
  }
  if (status === "paused") {
    const p = Math.min(1, Math.max(0, state.phaseProgress));
    const scale =
      state.phase === "inhale"
        ? CIRCLE_MIN_SCALE + range * p
        : state.phase === "hold"
          ? CIRCLE_MAX_SCALE
          : CIRCLE_MAX_SCALE - range * p;
    return { scale, durationMs: 0 };
  }
  return {
    scale: state.phase === "exhale" ? CIRCLE_MIN_SCALE : CIRCLE_MAX_SCALE,
    durationMs: Math.max(0, Math.round(state.phaseRemainingMs)),
  };
}

/** "1:05" style countdown. */
export function formatClock(ms: number): string {
  const totalSeconds = Math.max(0, Math.ceil(ms / 1000));
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}
