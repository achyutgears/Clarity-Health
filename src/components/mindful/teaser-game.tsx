import { useEffect, useId, useRef, useState, type FormEvent } from "react";
import { ArrowRight, Check, Eye, Lightbulb, RotateCcw, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import {
  TEASERS,
  TEASER_KIND_LABELS,
  createTeaserRound,
  currentResult,
  currentTeaser,
  isRoundComplete,
  isTeaserDone,
  nextTeaser,
  revealTeaserAnswer,
  showTeaserHint,
  submitTeaserAnswer,
  summarizeRound,
  teaserAnswerText,
  type TeaserRound,
} from "@/lib/mindful";
import { ActivityFrame, BackToHub, PreparingState } from "./shared";

type Feedback = { tone: "wrong" | "right"; text: string } | null;

export function TeaserGame({ onExit }: { onExit: () => void }) {
  const [round, setRound] = useState<TeaserRound | null>(null);
  const [draft, setDraft] = useState("");
  const [feedback, setFeedback] = useState<Feedback>(null);
  const nextRef = useRef<HTMLButtonElement>(null);
  const promptRef = useRef<HTMLParagraphElement>(null);
  const summaryRef = useRef<HTMLHeadingElement>(null);
  const movedRef = useRef(false);
  const inputId = useId();

  useEffect(() => {
    setRound(createTeaserRound(TEASERS));
  }, []);

  const teaser = round ? currentTeaser(round) : null;
  const result = round ? currentResult(round) : null;
  const done = isTeaserDone(result);
  const finished = round ? isRoundComplete(round) : false;
  const index = round?.index ?? 0;
  const total = round?.items.length ?? 0;

  useEffect(() => {
    if (done) nextRef.current?.focus();
  }, [done]);
  useEffect(() => {
    if (!movedRef.current) return;
    if (finished) summaryRef.current?.focus();
    else promptRef.current?.focus();
  }, [index, finished]);

  const attempt = (value: string | number) => {
    if (!round) return;
    const r = submitTeaserAnswer(round, value);
    if (r.round === round) {
      if (typeof value === "string") {
        setFeedback({ tone: "wrong", text: "Type an answer first, then check it." });
      }
      return;
    }
    setRound(r.round);
    setFeedback(
      r.correct
        ? { tone: "right", text: "You got it!" }
        : { tone: "wrong", text: "Not quite yet. Take your time and try again." },
    );
  };

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    attempt(draft);
  };

  const goNext = () => {
    if (!round) return;
    movedRef.current = true;
    setRound(nextTeaser(round));
    setDraft("");
    setFeedback(null);
  };

  const replay = () => {
    movedRef.current = true;
    setRound(createTeaserRound(TEASERS));
    setDraft("");
    setFeedback(null);
  };

  if (!round) {
    return (
      <ActivityFrame eyebrow="Brain Teasers" title="Little puzzles, no rush" onExit={onExit}>
        <PreparingState label="Picking puzzles…" />
      </ActivityFrame>
    );
  }

  if (finished) {
    const s = summarizeRound(round);
    return (
      <ActivityFrame eyebrow="Brain Teasers" title="Little puzzles, no rush" onExit={onExit}>
        <div className="surface max-w-2xl p-6 md:p-8">
          <div className="eyebrow">Round complete</div>
          <h3
            ref={summaryRef}
            tabIndex={-1}
            className="mt-2 font-display text-3xl leading-tight focus:outline-none md:text-4xl"
          >
            You worked through {s.total} puzzles.
          </h3>
          <ul className="mt-4 space-y-1 text-sm text-muted-foreground">
            <li>
              Solved: {s.solved} of {s.total}
              {s.solved > 0 && ` (${s.solvedWithoutHint} without a hint)`}
            </li>
            {s.revealed > 0 && (
              <li>Answers peeked at: {s.revealed}. That’s a fine way to learn.</li>
            )}
          </ul>
          <p className="mt-4 text-muted-foreground">
            Thanks for giving your mind a little stretch.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Button onClick={replay} className="h-11 px-5">
              <RotateCcw aria-hidden="true" /> New round
            </Button>
            <Button variant="outline" onClick={onExit} className="h-11 px-5">
              Back to Mindful Moments
            </Button>
          </div>
        </div>
      </ActivityFrame>
    );
  }

  if (!teaser || !result) {
    return (
      <ActivityFrame eyebrow="Brain Teasers" title="Little puzzles, no rush" onExit={onExit}>
        <p className="text-sm text-muted-foreground">No puzzles are available right now.</p>
        <BackToHub onExit={onExit} />
      </ActivityFrame>
    );
  }

  return (
    <ActivityFrame eyebrow="Brain Teasers" title="Little puzzles, no rush" onExit={onExit}>
      <div className="max-w-2xl">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <p className="text-sm font-medium" id="teaser-progress-label">
            Puzzle {index + 1} of {total}
          </p>
          <span className="eyebrow">{TEASER_KIND_LABELS[teaser.kind]}</span>
        </div>
        <Progress
          value={((index + (done ? 1 : 0)) / total) * 100}
          aria-labelledby="teaser-progress-label"
          className="mt-2 h-1.5 bg-teal-soft"
        />

        <p
          ref={promptRef}
          tabIndex={-1}
          className="mt-8 font-display text-3xl leading-snug focus:outline-none md:text-[2.1rem]"
        >
          {teaser.prompt}
        </p>
        {teaser.display && (
          <p className="mt-4 break-words rounded-lg bg-teal-soft px-4 py-4 text-center font-mono text-xl tracking-wide text-accent-foreground md:text-2xl">
            {teaser.display}
          </p>
        )}

        {teaser.type === "text" ? (
          <form onSubmit={onSubmit} noValidate className="mt-6">
            <Label htmlFor={inputId}>Your answer</Label>
            <div className="mt-2 flex flex-col gap-3 sm:flex-row">
              <Input
                id={inputId}
                value={done ? (result.solved ? draft : teaser.canonicalAnswer) : draft}
                onChange={(e) => setDraft(e.target.value)}
                disabled={done}
                autoComplete="off"
                autoCapitalize="none"
                spellCheck={false}
                maxLength={60}
                className="h-11 bg-card text-base"
              />
              <Button type="submit" disabled={done} className="h-11 px-5">
                Check
              </Button>
            </div>
          </form>
        ) : (
          <ul
            className={cn(
              "mt-6 grid gap-3",
              teaser.options.some((o) => o.symbol)
                ? "grid-cols-2 sm:grid-cols-4"
                : "sm:grid-cols-2",
            )}
            aria-label="Options"
          >
            {teaser.options.map((opt, i) => {
              const tried = result.tried.includes(i);
              const isAnswer = i === teaser.answerIndex;
              const showRight = done && isAnswer;
              const showWrong = tried && !isAnswer;
              return (
                <li key={opt.label}>
                  <button
                    type="button"
                    onClick={() => {
                      if (!showWrong) attempt(i);
                    }}
                    disabled={done}
                    aria-disabled={showWrong || undefined}
                    aria-label={
                      showWrong
                        ? `${opt.label}, not this one`
                        : showRight
                          ? `${opt.label}, the answer`
                          : opt.label
                    }
                    className={cn(
                      "flex min-h-14 w-full flex-col items-center justify-center gap-1 rounded-lg border bg-card px-3 py-3 text-center text-base transition-colors",
                      "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
                      !done && !showWrong && "hover:border-primary hover:bg-teal-soft",
                      showRight && "border-success bg-teal-soft",
                      showWrong && "cursor-default border-dashed opacity-60",
                      done && !showRight && "opacity-60",
                    )}
                  >
                    {opt.symbol && (
                      <span aria-hidden="true" className="text-4xl leading-none">
                        {opt.symbol}
                      </span>
                    )}
                    <span className="flex items-center gap-1.5">
                      {showRight && <Check className="h-4 w-4 text-success" aria-hidden="true" />}
                      {showWrong && <X className="h-4 w-4 text-destructive" aria-hidden="true" />}
                      {opt.label}
                    </span>
                    {showWrong && (
                      <span className="text-xs text-muted-foreground">Not this one</span>
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        )}

        <div aria-live="polite" role="status" className="mt-4 min-h-6 text-sm">
          {feedback && !result.revealed && (
            <p
              className={cn(
                "flex items-center gap-2 font-medium",
                feedback.tone === "right" ? "text-success" : "text-warning-foreground",
              )}
            >
              {feedback.tone === "right" ? (
                <Check className="h-4 w-4" aria-hidden="true" />
              ) : (
                <X className="h-4 w-4" aria-hidden="true" />
              )}
              {feedback.text}
            </p>
          )}
          {result.revealed && (
            <p className="flex items-center gap-2 font-medium text-accent-foreground">
              <Eye className="h-4 w-4" aria-hidden="true" /> The answer is{" "}
              {teaserAnswerText(teaser)}.
            </p>
          )}
          {done && (
            <p className="mt-2 leading-relaxed text-muted-foreground">{teaser.explanation}</p>
          )}
        </div>

        {result.hintUsed && !done && (
          <div className="mt-4 flex gap-2 border-l-2 border-primary bg-teal-soft px-4 py-3 text-sm text-accent-foreground">
            <Lightbulb className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            <p>
              <span className="font-medium">Hint:</span> {teaser.hint}
            </p>
          </div>
        )}

        <div className="mt-6 flex flex-wrap items-center gap-3">
          {done ? (
            <Button ref={nextRef} onClick={goNext} className="h-11 px-5">
              {index + 1 === total ? "See round summary" : "Next puzzle"}
              <ArrowRight aria-hidden="true" />
            </Button>
          ) : (
            <>
              <Button
                variant="outline"
                onClick={() => setRound(showTeaserHint(round))}
                disabled={result.hintUsed}
                className="h-11 px-4"
              >
                <Lightbulb aria-hidden="true" /> {result.hintUsed ? "Hint shown" : "Hint"}
              </Button>
              <Button
                variant="ghost"
                onClick={() => {
                  setRound(revealTeaserAnswer(round));
                  setFeedback(null);
                }}
                className="h-11 px-4"
              >
                <Eye aria-hidden="true" /> Show answer
              </Button>
              {result.attempts > 0 && (
                <span className="text-xs text-muted-foreground">
                  Tries so far: {result.attempts}. There’s no limit.
                </span>
              )}
            </>
          )}
        </div>
      </div>
    </ActivityFrame>
  );
}
