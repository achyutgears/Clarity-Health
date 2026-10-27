import { describe, expect, it } from "vitest";
import {
  CALM_BREATH_PATTERN,
  CIRCLE_MAX_SCALE,
  CIRCLE_MIN_SCALE,
  breathingElapsedMs,
  breathingStateAt,
  circleTarget,
  createBreathingController,
  cycleMs,
  endBreathing,
  formatClock,
  pauseBreathing,
  resetBreathing,
  resumeBreathing,
  sessionCycles,
  sessionDurationMs,
  startBreathing,
  tickBreathing,
} from "./breathing";

describe("pattern and durations", () => {
  it("uses a 4-4-6 pattern", () => {
    expect(CALM_BREATH_PATTERN).toEqual({ inhale: 4, hold: 4, exhale: 6 });
    expect(cycleMs()).toBe(14_000);
  });

  it("fits whole breaths to 1, 2 and 3 minutes", () => {
    expect(sessionCycles(1)).toBe(4);
    expect(sessionCycles(2)).toBe(9);
    expect(sessionCycles(3)).toBe(13);
    expect(sessionDurationMs(1)).toBe(56_000);
    expect(sessionDurationMs(2)).toBe(126_000);
    expect(sessionDurationMs(3)).toBe(182_000);
  });
});

describe("breathingStateAt", () => {
  const total = sessionDurationMs(1);

  it("handles phase boundaries", () => {
    expect(breathingStateAt(0, total).phase).toBe("inhale");
    expect(breathingStateAt(3_999, total).phase).toBe("inhale");
    expect(breathingStateAt(4_000, total).phase).toBe("hold");
    expect(breathingStateAt(7_999, total).phase).toBe("hold");
    expect(breathingStateAt(8_000, total).phase).toBe("exhale");
    expect(breathingStateAt(13_999, total).phase).toBe("exhale");
    const next = breathingStateAt(14_000, total);
    expect(next.phase).toBe("inhale");
    expect(next.cycle).toBe(2);
  });

  it("reports remaining time and progress", () => {
    const s = breathingStateAt(1_000, total);
    expect(s.phaseRemainingMs).toBe(3_000);
    expect(s.phaseProgress).toBeCloseTo(0.25);
    expect(s.cycle).toBe(1);
    expect(s.totalCycles).toBe(4);
    expect(s.totalRemainingMs).toBe(55_000);
    expect(s.complete).toBe(false);

    const ex = breathingStateAt(11_000, total);
    expect(ex.phase).toBe("exhale");
    expect(ex.phaseRemainingMs).toBe(3_000);
    expect(ex.phaseProgress).toBeCloseTo(0.5);
  });

  it("is complete at and after the total duration, and clamps negatives", () => {
    expect(breathingStateAt(total - 1, total).complete).toBe(false);
    const done = breathingStateAt(total, total);
    expect(done.complete).toBe(true);
    expect(done.totalRemainingMs).toBe(0);
    expect(done.cycle).toBe(4);
    expect(breathingStateAt(total + 5_000, total).complete).toBe(true);
    expect(breathingStateAt(-500, total).phaseRemainingMs).toBe(4_000);
  });
});

describe("breathing controller", () => {
  const total = sessionDurationMs(1);

  it("accounts for paused time correctly", () => {
    let c = createBreathingController(total);
    expect(c.status).toBe("idle");
    expect(breathingElapsedMs(c, 5_000)).toBe(0);

    c = startBreathing(c, 1_000);
    expect(c.status).toBe("running");
    expect(breathingElapsedMs(c, 3_500)).toBe(2_500);

    c = pauseBreathing(c, 4_000);
    expect(c.status).toBe("paused");
    expect(breathingElapsedMs(c, 4_000)).toBe(3_000);
    // Time passing while paused does not count.
    expect(breathingElapsedMs(c, 60_000)).toBe(3_000);

    c = resumeBreathing(c, 100_000);
    expect(c.status).toBe("running");
    expect(breathingElapsedMs(c, 102_000)).toBe(5_000);
  });

  it("ignores invalid transitions", () => {
    const idle = createBreathingController(total);
    expect(pauseBreathing(idle, 10)).toBe(idle);
    expect(resumeBreathing(idle, 10)).toBe(idle);
    expect(endBreathing(idle, 10)).toBe(idle);
    const running = startBreathing(idle, 0);
    expect(startBreathing(running, 50)).toBe(running);
    expect(resumeBreathing(running, 50)).toBe(running);
  });

  it("completes when the duration elapses", () => {
    let c = startBreathing(createBreathingController(total), 0);
    c = tickBreathing(c, total - 1);
    expect(c.status).toBe("running");
    c = tickBreathing(c, total + 300);
    expect(c.status).toBe("complete");
    expect(breathingElapsedMs(c, total + 10_000)).toBe(total);
  });

  it("can end early, restart and reset", () => {
    let c = startBreathing(createBreathingController(total), 0);
    c = endBreathing(c, 9_000);
    expect(c.status).toBe("complete");
    expect(breathingElapsedMs(c, 20_000)).toBe(9_000);
    c = startBreathing(c, 30_000);
    expect(c.status).toBe("running");
    expect(breathingElapsedMs(c, 31_000)).toBe(1_000);
    c = resetBreathing(c, sessionDurationMs(2));
    expect(c).toEqual(createBreathingController(sessionDurationMs(2)));
  });
});

describe("circleTarget", () => {
  const total = sessionDurationMs(1);

  it("grows on inhale, holds, shrinks on exhale while running", () => {
    expect(circleTarget(breathingStateAt(1_000, total), "running")).toEqual({
      scale: CIRCLE_MAX_SCALE,
      durationMs: 3_000,
    });
    expect(circleTarget(breathingStateAt(5_000, total), "running").scale).toBe(CIRCLE_MAX_SCALE);
    expect(circleTarget(breathingStateAt(9_000, total), "running")).toEqual({
      scale: CIRCLE_MIN_SCALE,
      durationMs: 5_000,
    });
  });

  it("freezes in place while paused", () => {
    const t = circleTarget(breathingStateAt(2_000, total), "paused");
    expect(t.durationMs).toBe(0);
    expect(t.scale).toBeCloseTo((CIRCLE_MIN_SCALE + CIRCLE_MAX_SCALE) / 2);
  });
});

describe("formatClock", () => {
  it("formats minutes and seconds", () => {
    expect(formatClock(56_000)).toBe("0:56");
    expect(formatClock(65_400)).toBe("1:06");
    expect(formatClock(0)).toBe("0:00");
    expect(formatClock(-10)).toBe("0:00");
  });
});
