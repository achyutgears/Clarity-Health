import { useEffect, useRef, useState } from "react";
import { Pause, Play, RotateCcw, Square } from "lucide-react";
import { Notice } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import {
  CALM_BREATH_PATTERN,
  PHASE_LABELS,
  SESSION_MINUTES,
  breathingElapsedMs,
  breathingStateAt,
  circleTarget,
  createBreathingController,
  endBreathing,
  formatClock,
  pauseBreathing,
  resetBreathing,
  resumeBreathing,
  sessionCycles,
  sessionDurationMs,
  startBreathing,
  tickBreathing,
  type BreathingController,
  type SessionMinutes,
} from "@/lib/mindful";
import { ActivityFrame } from "./shared";
import { usePrefersReducedMotion } from "./use-prefers-reduced-motion";

const TICK_MS = 250;
const now = () => (typeof performance !== "undefined" ? performance.now() : Date.now());

export function CalmBreak({ onExit }: { onExit: () => void }) {
  const [minutes, setMinutes] = useState<SessionMinutes>(1);
  const [ctrl, setCtrl] = useState<BreathingController>(() =>
    createBreathingController(sessionDurationMs(1)),
  );
  const [clock, setClock] = useState(0);
  const [autoPaused, setAutoPaused] = useState(false);
  const [manualReduce, setManualReduce] = useState(false);
  const systemReduce = usePrefersReducedMotion();
  const reduceMotion = systemReduce || manualReduce;
  const ctrlRef = useRef(ctrl);
  useEffect(() => {
    ctrlRef.current = ctrl;
  }, [ctrl]);
  const primaryRef = useRef<HTMLButtonElement>(null);

  const running = ctrl.status === "running";

  // Drive the clock from performance.now() while running; cleaned up on pause/unmount.
  useEffect(() => {
    if (!running) return;
    const id = window.setInterval(() => {
      const t = now();
      setClock(t);
      setCtrl((c) => tickBreathing(c, t));
    }, TICK_MS);
    return () => window.clearInterval(id);
  }, [running]);

  // Pause when the tab is hidden so the session doesn't run on unseen.
  useEffect(() => {
    const onVisibility = () => {
      if (document.visibilityState !== "hidden") return;
      if (ctrlRef.current.status !== "running") return;
      const t = now();
      setCtrl((c) => pauseBreathing(c, t));
      setClock(t);
      setAutoPaused(true);
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, []);

  const elapsed = breathingElapsedMs(ctrl, clock);
  const state = breathingStateAt(elapsed, ctrl.totalMs);
  const target = circleTarget(state, ctrl.status);
  const circleStyle = {
    transform: `scale(${reduceMotion ? 0.85 : target.scale})`,
    transitionProperty: reduceMotion ? "none" : "transform",
    transitionDuration: reduceMotion ? "0ms" : `${target.durationMs}ms`,
    transitionTimingFunction: "linear",
  } as const;

  const act = (fn: (c: BreathingController, t: number) => BreathingController) => {
    const t = now();
    setClock(t);
    setAutoPaused(false);
    setCtrl((c) => fn(c, t));
    // Keep keyboard focus on the main control as buttons swap.
    window.requestAnimationFrame(() => primaryRef.current?.focus());
  };

  const pickMinutes = (m: SessionMinutes) => {
    setMinutes(m);
    setCtrl(resetBreathing(ctrl, sessionDurationMs(m)));
  };

  const startAgain = () => {
    setAutoPaused(false);
    setCtrl((c) => resetBreathing(c, sessionDurationMs(minutes)));
    window.requestAnimationFrame(() => primaryRef.current?.focus());
  };

  const liveText =
    ctrl.status === "running"
      ? PHASE_LABELS[state.phase]
      : ctrl.status === "paused"
        ? "Paused"
        : ctrl.status === "complete"
          ? "Nice work taking a moment for yourself."
          : "Ready when you are";

  const phaseSeconds = Math.max(0, Math.ceil(state.phaseRemainingMs / 1000));
  const locked = ctrl.status === "running" || ctrl.status === "paused";

  return (
    <ActivityFrame eyebrow="Calm Break" title="Breathe along for a moment" onExit={onExit}>
      <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="flex flex-col items-center">
          {/* Breathing circle: scaled layers are decorative; the text layer never scales. */}
          <div className="relative flex aspect-square w-full max-w-[18rem] items-center justify-center sm:max-w-[20rem]">
            <div
              aria-hidden="true"
              className={cn(
                "absolute inset-0 rounded-full border border-primary/30 bg-teal-soft",
                ctrl.status === "complete" && "border-success/40",
              )}
              style={circleStyle}
            />
            <div
              aria-hidden="true"
              className="absolute inset-[18%] rounded-full bg-primary/10"
              style={circleStyle}
            />
            <div className="relative flex flex-col items-center justify-center px-6 text-center">
              <p
                role="status"
                aria-live="polite"
                className={cn(
                  "font-display leading-tight text-accent-foreground",
                  ctrl.status === "complete" ? "text-2xl md:text-[1.7rem]" : "text-3xl md:text-4xl",
                )}
              >
                {liveText}
              </p>
              {locked && (
                <p className="mt-1 font-mono text-sm text-muted-foreground" aria-hidden="true">
                  {phaseSeconds}s
                </p>
              )}
            </div>
          </div>

          {reduceMotion && locked && (
            <div className="mt-2 w-full max-w-xs">
              <Progress
                value={state.phaseProgress * 100}
                aria-label={`${PHASE_LABELS[state.phase]} progress`}
                className="h-1 bg-teal-soft"
              />
            </div>
          )}

          <p className="mt-4 text-sm text-muted-foreground">
            {ctrl.status === "complete"
              ? `You spent ${formatClock(elapsed)} breathing calmly.`
              : locked
                ? `Breath ${state.cycle} of ${state.totalCycles} · ${formatClock(state.totalRemainingMs)} left`
                : `In ${CALM_BREATH_PATTERN.inhale}s · hold ${CALM_BREATH_PATTERN.hold}s · out ${CALM_BREATH_PATTERN.exhale}s`}
          </p>
          {autoPaused && ctrl.status === "paused" && (
            <p className="mt-1 text-xs text-muted-foreground">
              Paused because you switched away from this tab.
            </p>
          )}

          <div className="mt-6 flex flex-wrap justify-center gap-3">
            {ctrl.status === "idle" && (
              <Button ref={primaryRef} onClick={() => act(startBreathing)} className="h-11 px-6">
                <Play aria-hidden="true" /> Start
              </Button>
            )}
            {ctrl.status === "running" && (
              <Button ref={primaryRef} onClick={() => act(pauseBreathing)} className="h-11 px-6">
                <Pause aria-hidden="true" /> Pause
              </Button>
            )}
            {ctrl.status === "paused" && (
              <Button ref={primaryRef} onClick={() => act(resumeBreathing)} className="h-11 px-6">
                <Play aria-hidden="true" /> Resume
              </Button>
            )}
            {locked && (
              <Button variant="outline" onClick={() => act(endBreathing)} className="h-11 px-6">
                <Square aria-hidden="true" /> End
              </Button>
            )}
            {ctrl.status === "complete" && (
              <>
                <Button ref={primaryRef} onClick={startAgain} className="h-11 px-6">
                  <RotateCcw aria-hidden="true" /> Breathe again
                </Button>
                <Button variant="outline" onClick={onExit} className="h-11 px-6">
                  Back to Mindful Moments
                </Button>
              </>
            )}
          </div>
        </div>

        <aside className="space-y-6" aria-label="Calm Break settings">
          <fieldset disabled={locked} className="space-y-3 disabled:opacity-60">
            <legend className="eyebrow">Session length</legend>
            <div className="grid grid-cols-3 gap-2">
              {SESSION_MINUTES.map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => pickMinutes(m)}
                  aria-pressed={minutes === m}
                  className={cn(
                    "flex min-h-14 flex-col items-center justify-center rounded-lg border bg-card px-2 py-2 text-sm transition-colors",
                    "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
                    minutes === m
                      ? "border-primary bg-teal-soft text-accent-foreground"
                      : "hover:border-primary",
                  )}
                >
                  <span className="font-medium">{m} min</span>
                  <span className="text-xs text-muted-foreground">{sessionCycles(m)} breaths</span>
                </button>
              ))}
            </div>
            {locked && (
              <p className="text-xs text-muted-foreground">End the session to change its length.</p>
            )}
          </fieldset>

          <div className="flex items-center justify-between gap-4 rounded-lg border bg-card px-4 py-3">
            <label htmlFor="calm-reduce-motion" className="min-h-10 flex-1 cursor-pointer">
              <span className="block text-sm font-medium">Reduce motion</span>
              <span id="calm-reduce-motion-desc" className="block text-xs text-muted-foreground">
                {systemReduce
                  ? "On because your device prefers reduced motion."
                  : "Keeps the circle still and shows a progress bar."}
              </span>
            </label>
            <Switch
              id="calm-reduce-motion"
              aria-describedby="calm-reduce-motion-desc"
              checked={reduceMotion}
              disabled={systemReduce}
              onCheckedChange={setManualReduce}
            />
          </div>

          <Notice>This is a relaxation exercise, not a treatment. Stop anytime.</Notice>
        </aside>
      </div>
    </ActivityFrame>
  );
}
