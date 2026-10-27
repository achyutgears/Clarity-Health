import { useEffect, useRef, type ReactNode } from "react";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

export function BackToHub({ onExit }: { onExit: () => void }) {
  return (
    <Button variant="ghost" onClick={onExit} className="-ml-3 h-10 px-3 text-muted-foreground">
      <ArrowLeft aria-hidden="true" /> Back to Mindful Moments
    </Button>
  );
}

/** Frames an activity with a back control and a heading that receives focus on open. */
export function ActivityFrame({
  eyebrow,
  title,
  onExit,
  children,
}: {
  eyebrow: string;
  title: string;
  onExit: () => void;
  children: ReactNode;
}) {
  const headingRef = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    headingRef.current?.focus();
  }, []);

  return (
    <section aria-labelledby="mindful-activity-title" className="motion-safe:animate-rise">
      <BackToHub onExit={onExit} />
      <div className="mt-4 rule-top">
        <div className="eyebrow">{eyebrow}</div>
        <h2
          id="mindful-activity-title"
          ref={headingRef}
          tabIndex={-1}
          className="mt-2 font-display text-4xl leading-tight focus:outline-none md:text-5xl"
        >
          {title}
        </h2>
      </div>
      <div className="mt-8">{children}</div>
    </section>
  );
}

export function PreparingState({ label }: { label: string }) {
  return (
    <p role="status" aria-live="polite" className="text-sm text-muted-foreground">
      {label}
    </p>
  );
}
