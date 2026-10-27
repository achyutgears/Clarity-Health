import { act, renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { ReactNode } from "react";
import { ReviewSessionProvider, useReviewSession } from "./review-session";
import { exampleInstructions } from "./synthetic-data";

function wrapper({ children }: { children: ReactNode }) {
  return <ReviewSessionProvider>{children}</ReviewSessionProvider>;
}

const SAMPLE = exampleInstructions[0]?.text ?? "Keep the dressing dry for 48 hours.";

describe("ReviewSessionProvider workflow", () => {
  it("runs analysis, then accept / edit / reject against engine candidates", async () => {
    const { result } = renderHook(() => useReviewSession(), { wrapper });

    act(() => {
      result.current.loadExample("ex-1", SAMPLE);
    });
    expect(result.current.phase).toBe("idle");
    expect(result.current.snapshot.source).toBe(SAMPLE);

    act(() => {
      result.current.runAnalysis();
    });
    expect(result.current.phase).toBe("loading");

    await waitFor(() => expect(result.current.phase).toBe("ready"));
    expect(result.current.counts.total).toBeGreaterThan(1);
    expect(result.current.counts.pending).toBe(result.current.counts.total);

    const first = result.current.snapshot.tasks[0]!;
    const second = result.current.snapshot.tasks[1]!;
    const evidence = first.candidate.evidence;

    act(() => {
      result.current.setTaskStatus(first.candidate.id, "accepted");
    });
    expect(result.current.counts.accepted).toBe(1);
    expect(
      result.current.snapshot.tasks.find((t) => t.candidate.id === first.candidate.id)?.candidate
        .evidence,
    ).toBe(evidence);

    act(() => {
      result.current.saveEditedTitle(second.candidate.id, "Revised follow-up wording");
    });
    const edited = result.current.snapshot.tasks.find((t) => t.candidate.id === second.candidate.id)!;
    expect(edited.status).toBe("edited");
    expect(edited.proposedTitle).toBe("Revised follow-up wording");
    expect(edited.candidate.title).not.toBe("Revised follow-up wording");

    const third = result.current.snapshot.tasks[2];
    if (third) {
      act(() => {
        result.current.setTaskStatus(third.candidate.id, "rejected");
      });
      expect(result.current.counts.rejected).toBe(1);
    }

    expect(result.current.counts.pending).toBe(
      result.current.counts.total -
        result.current.counts.accepted -
        result.current.counts.edited -
        result.current.counts.rejected,
    );
  });

  it("exposes an error state for empty input", async () => {
    const { result } = renderHook(() => useReviewSession(), { wrapper });

    act(() => {
      result.current.setSource("   ");
      result.current.runAnalysis();
    });

    await waitFor(() => expect(result.current.phase).toBe("error"));
    expect(result.current.snapshot.error).toMatch(/instruction text/i);
    expect(result.current.counts.total).toBe(0);
  });

  it("clears derived counts when the source document changes after analysis", async () => {
    const { result } = renderHook(() => useReviewSession(), { wrapper });

    act(() => {
      result.current.loadExample("ex-1", SAMPLE);
      result.current.runAnalysis();
    });
    await waitFor(() => expect(result.current.phase).toBe("ready"));
    expect(result.current.counts.total).toBeGreaterThan(0);

    act(() => {
      result.current.setSource(SAMPLE + " Extra note.");
    });
    expect(result.current.phase).toBe("idle");
    expect(result.current.counts.total).toBe(0);
  });
});
