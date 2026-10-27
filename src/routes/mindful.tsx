import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef } from "react";
import { ArrowRight, CircleHelp, Puzzle, Wind, type LucideIcon } from "lucide-react";
import { PageHeader } from "@/components/app-shell";
import { CalmBreak } from "@/components/mindful/calm-break";
import { QuizGame } from "@/components/mindful/quiz-game";
import { TeaserGame } from "@/components/mindful/teaser-game";
import {
  DEFAULT_QUIZ_LENGTH,
  TEASER_ROUND_SIZE,
  parseMindfulActivity,
  type MindfulActivity,
} from "@/lib/mindful";
import { pageMeta } from "@/lib/seo";

interface MindfulSearch {
  activity?: MindfulActivity;
}

export const Route = createFileRoute("/mindful")({
  validateSearch: (search: Record<string, unknown>): MindfulSearch => {
    const activity = parseMindfulActivity(search["activity"]);
    return activity ? { activity } : {};
  },
  head: () =>
    pageMeta(
      "Mindful Moments",
      "Optional, calm mini-games: a quick quiz, brain teasers and a guided breathing break.",
    ),
  component: MindfulMoments,
});

const ACTIVITIES: {
  id: MindfulActivity;
  title: string;
  description: string;
  time: string;
  icon: LucideIcon;
}[] = [
  {
    id: "quiz",
    title: "Quick Quiz",
    description: `${DEFAULT_QUIZ_LENGTH} light questions about nature, animals, science and space.`,
    time: "About 5 min",
    icon: CircleHelp,
  },
  {
    id: "teasers",
    title: "Brain Teasers",
    description: `${TEASER_ROUND_SIZE} gentle puzzles with hints whenever you want them.`,
    time: "About 5 min",
    icon: Puzzle,
  },
  {
    id: "calm",
    title: "Calm Break",
    description: "A guided breathing pace: in for 4, hold for 4, out for 6.",
    time: "1–3 min",
    icon: Wind,
  },
];

function MindfulMoments() {
  const { activity } = Route.useSearch();
  const navigate = Route.useNavigate();
  const cardRefs = useRef<Partial<Record<MindfulActivity, HTMLButtonElement | null>>>({});
  const lastActivity = useRef<MindfulActivity | null>(null);

  const open = (id: MindfulActivity) => {
    lastActivity.current = id;
    void navigate({ search: { activity: id } });
  };
  const exit = () => {
    void navigate({ search: {} });
  };

  // Returning to the hub puts focus back on the card that was opened.
  useEffect(() => {
    if (activity) {
      lastActivity.current = activity;
      return;
    }
    const last = lastActivity.current;
    if (last) cardRefs.current[last]?.focus();
  }, [activity]);

  return (
    <>
      <PageHeader
        eyebrow="Care · Mindful Moments"
        title="Mindful Moments"
        description="Take a little break for yourself."
      />

      {activity === "quiz" ? (
        <QuizGame key="quiz" onExit={exit} />
      ) : activity === "teasers" ? (
        <TeaserGame key="teasers" onExit={exit} />
      ) : activity === "calm" ? (
        <CalmBreak key="calm" onExit={exit} />
      ) : (
        <section aria-labelledby="mindful-choose" className="motion-safe:animate-rise">
          <h2 id="mindful-choose" className="sr-only">
            Choose an activity
          </h2>
          <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground">
            Everything here is optional and just for fun. Nothing is tracked over time: no streaks,
            no leaderboards, and nothing you do is saved or sent anywhere.
          </p>
          <ul className="mt-8 grid gap-4 md:grid-cols-3">
            {ACTIVITIES.map(({ id, title, description, time, icon: Icon }) => (
              <li key={id}>
                <button
                  type="button"
                  ref={(el) => {
                    cardRefs.current[id] = el;
                  }}
                  onClick={() => open(id)}
                  className="surface group flex h-full w-full flex-col items-start gap-4 p-6 text-left transition-colors hover:border-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                >
                  <span
                    aria-hidden="true"
                    className="flex h-12 w-12 items-center justify-center rounded-full bg-teal-soft text-accent-foreground"
                  >
                    <Icon className="h-6 w-6" />
                  </span>
                  <span className="block">
                    <span className="block font-display text-3xl leading-tight">{title}</span>
                    <span className="mt-2 block text-sm leading-relaxed text-muted-foreground">
                      {description}
                    </span>
                  </span>
                  <span className="mt-auto flex w-full items-center justify-between pt-2">
                    <span className="eyebrow">{time}</span>
                    <span className="inline-flex items-center gap-1 text-sm font-medium text-accent-foreground">
                      Start
                      <ArrowRight
                        aria-hidden="true"
                        className="h-4 w-4 transition-transform motion-safe:group-hover:translate-x-0.5"
                      />
                    </span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}
    </>
  );
}
