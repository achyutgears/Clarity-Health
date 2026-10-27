import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowRight, Check, RotateCcw, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import {
  QUIZ_CATEGORY_LABELS,
  QUIZ_QUESTIONS,
  answer,
  completionMessage,
  createQuizSession,
  currentAnswer,
  currentQuestion,
  isComplete,
  isLastQuestion,
  next,
  score,
  type QuizSession,
} from "@/lib/mindful";
import { ActivityFrame, BackToHub, PreparingState } from "./shared";

export function QuizGame({ onExit }: { onExit: () => void }) {
  // Created after mount so server and client markup match (shuffling is random).
  const [session, setSession] = useState<QuizSession | null>(null);
  const nextRef = useRef<HTMLButtonElement>(null);
  const questionRef = useRef<HTMLParagraphElement>(null);
  const resultRef = useRef<HTMLHeadingElement>(null);
  const movedRef = useRef(false);

  useEffect(() => {
    setSession(createQuizSession(QUIZ_QUESTIONS));
  }, []);

  const choose = useCallback((i: number) => {
    setSession((s) => (s ? answer(s, i) : s));
  }, []);

  const q = session ? currentQuestion(session) : null;
  const picked = session ? currentAnswer(session) : null;
  const answered = picked !== null;
  const done = session ? isComplete(session) : false;
  const index = session?.current ?? 0;
  const total = session?.questions.length ?? 0;

  // Keyboard shortcuts 1–4 pick a choice.
  useEffect(() => {
    if (!q || answered) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.altKey || e.ctrlKey || e.metaKey || e.repeat) return;
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable)) return;
      const n = Number.parseInt(e.key, 10);
      if (n >= 1 && n <= q.choices.length) {
        e.preventDefault();
        choose(n - 1);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [q, answered, choose]);

  // Focus management: Next after answering, the new question after moving on.
  useEffect(() => {
    if (answered) nextRef.current?.focus();
  }, [answered]);
  useEffect(() => {
    if (!movedRef.current) return;
    if (done) resultRef.current?.focus();
    else questionRef.current?.focus();
  }, [index, done]);

  const goNext = () => {
    movedRef.current = true;
    setSession((s) => (s ? next(s) : s));
  };

  const replay = () => {
    movedRef.current = true;
    setSession(createQuizSession(QUIZ_QUESTIONS));
  };

  return (
    <ActivityFrame eyebrow="Quick Quiz" title="A few friendly questions" onExit={onExit}>
      {!session ? (
        <PreparingState label="Shuffling questions…" />
      ) : done ? (
        <div className="surface max-w-2xl p-6 md:p-8">
          <div className="eyebrow">All done</div>
          <h3
            ref={resultRef}
            tabIndex={-1}
            className="mt-2 font-display text-3xl leading-tight focus:outline-none md:text-4xl"
          >
            You answered {score(session)} of {total} correctly.
          </h3>
          <p className="mt-3 text-muted-foreground">{completionMessage(score(session), total)}</p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Button onClick={replay} className="h-11 px-5">
              <RotateCcw aria-hidden="true" /> Play again
            </Button>
            <Button variant="outline" onClick={onExit} className="h-11 px-5">
              Back to Mindful Moments
            </Button>
          </div>
        </div>
      ) : q ? (
        <div className="max-w-2xl">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <p className="text-sm font-medium" id="quiz-progress-label">
              Question {index + 1} of {total}
            </p>
            <span className="eyebrow">{QUIZ_CATEGORY_LABELS[q.category]}</span>
          </div>
          <Progress
            value={((index + (answered ? 1 : 0)) / total) * 100}
            aria-labelledby="quiz-progress-label"
            className="mt-2 h-1.5 bg-teal-soft"
          />

          <p
            ref={questionRef}
            tabIndex={-1}
            className="mt-8 font-display text-3xl leading-snug focus:outline-none md:text-[2.1rem]"
          >
            {q.prompt}
          </p>
          <p className="mt-2 text-xs text-muted-foreground">
            Tip: press 1–4 on your keyboard to choose.
          </p>

          <ul className="mt-6 grid gap-3" aria-label="Choices">
            {q.choices.map((choice, i) => {
              const isAnswer = i === q.answerIndex;
              const isPicked = i === picked;
              const showCorrect = answered && isAnswer;
              const showWrong = answered && isPicked && !isAnswer;
              return (
                <li key={choice}>
                  <button
                    type="button"
                    onClick={() => choose(i)}
                    disabled={answered}
                    className={cn(
                      "flex min-h-14 w-full items-center gap-4 rounded-lg border bg-card px-4 py-3 text-left text-base transition-colors",
                      "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
                      !answered && "hover:border-primary hover:bg-teal-soft",
                      answered && "cursor-default",
                      showCorrect && "border-success bg-teal-soft",
                      showWrong && "border-destructive/60 bg-warning-soft",
                      answered && !showCorrect && !showWrong && "opacity-60",
                    )}
                  >
                    <span
                      aria-hidden="true"
                      className={cn(
                        "flex h-8 w-8 shrink-0 items-center justify-center rounded-full border font-mono text-xs",
                        showCorrect && "border-success bg-success text-primary-foreground",
                        showWrong &&
                          "border-destructive bg-destructive text-destructive-foreground",
                      )}
                    >
                      {showCorrect ? (
                        <Check className="h-4 w-4" />
                      ) : showWrong ? (
                        <X className="h-4 w-4" />
                      ) : (
                        i + 1
                      )}
                    </span>
                    <span className="flex-1">{choice}</span>
                    {showCorrect && (
                      <span className="text-xs font-medium text-success">Correct answer</span>
                    )}
                    {showWrong && (
                      <span className="text-xs font-medium text-destructive">Your answer</span>
                    )}
                  </button>
                </li>
              );
            })}
          </ul>

          <div aria-live="polite" role="status" className="mt-6">
            {answered && (
              <div
                className={cn(
                  "border-l-2 px-4 py-3 text-sm leading-relaxed",
                  picked === q.answerIndex
                    ? "border-success bg-teal-soft text-accent-foreground"
                    : "border-warning bg-warning-soft text-warning-foreground",
                )}
              >
                <p className="flex items-center gap-2 font-medium">
                  {picked === q.answerIndex ? (
                    <>
                      <Check className="h-4 w-4" aria-hidden="true" /> That’s right!
                    </>
                  ) : (
                    <>
                      <X className="h-4 w-4" aria-hidden="true" /> Not quite. The answer is{" "}
                      {q.choices[q.answerIndex]}.
                    </>
                  )}
                </p>
                <p className="mt-1">{q.explanation}</p>
              </div>
            )}
          </div>

          <div className="mt-6 flex flex-wrap items-center gap-3">
            <Button ref={nextRef} onClick={goNext} disabled={!answered} className="h-11 px-5">
              {isLastQuestion(session) ? "See how it went" : "Next question"}
              <ArrowRight aria-hidden="true" />
            </Button>
            {!answered && (
              <span className="text-xs text-muted-foreground">Pick an answer to continue.</span>
            )}
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">No questions are available right now.</p>
          <BackToHub onExit={onExit} />
        </div>
      )}
    </ActivityFrame>
  );
}
