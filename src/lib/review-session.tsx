/**
 * Shared application state for instruction analysis and task review.
 * Dashboard and Instruction Studio both read from this provider.
 */
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  analyzeSource,
  computeReviewCounts,
  emptySnapshot,
  patchTask,
  type AnalysisPhase,
  type ReviewCounts,
  type ReviewSnapshot,
  type ReviewTask,
} from "./review-state";
import { exampleInstructions, type TaskStatus } from "./synthetic-data";

function initialSnapshot(): ReviewSnapshot {
  const ex = exampleInstructions[0];
  if (!ex) return emptySnapshot();
  return {
    ...emptySnapshot(),
    exampleId: ex.id,
    source: ex.text,
  };
}

interface ReviewSessionValue {
  snapshot: ReviewSnapshot;
  counts: ReviewCounts;
  selectedTask: ReviewTask | null;
  setSource: (text: string) => void;
  setExampleId: (id: string | null) => void;
  loadExample: (id: string, text: string) => void;
  runAnalysis: () => void;
  selectTask: (id: string | null) => void;
  setTaskStatus: (id: string, status: TaskStatus) => void;
  saveEditedTitle: (id: string, title: string) => void;
  clearAnalysis: () => void;
  phase: AnalysisPhase;
}

const Ctx = createContext<ReviewSessionValue | null>(null);

export function ReviewSessionProvider({ children }: { children: ReactNode }) {
  const [snapshot, setSnapshot] = useState<ReviewSnapshot>(initialSnapshot);

  const setSource = useCallback((text: string) => {
    setSnapshot((prev) => {
      const invalidate = prev.phase === "ready" || prev.phase === "error";
      return {
        ...prev,
        source: text,
        error: null,
        ...(invalidate
          ? {
              phase: "idle" as const,
              tasks: [],
              sentences: [],
              documentWarnings: [],
              selectedTaskId: null,
            }
          : {}),
      };
    });
  }, []);

  const setExampleId = useCallback((id: string | null) => {
    setSnapshot((prev) => ({ ...prev, exampleId: id }));
  }, []);

  const loadExample = useCallback((id: string, text: string) => {
    setSnapshot({
      ...emptySnapshot(),
      exampleId: id,
      source: text,
    });
  }, []);

  const runAnalysis = useCallback(() => {
    setSnapshot((prev) => ({
      ...prev,
      phase: "loading",
      error: null,
      tasks: [],
      sentences: [],
      documentWarnings: [],
      selectedTaskId: null,
    }));

    // Yield so the loading state paints before the sync engine runs.
    window.setTimeout(() => {
      setSnapshot((prev) => {
        try {
          return analyzeSource(prev.source, prev.exampleId);
        } catch (e) {
          return {
            ...prev,
            phase: "error" as const,
            error: e instanceof Error ? e.message : "Analysis failed.",
            tasks: [],
            sentences: [],
            documentWarnings: [],
            selectedTaskId: null,
          };
        }
      });
    }, 0);
  }, []);

  const selectTask = useCallback((id: string | null) => {
    setSnapshot((prev) => ({ ...prev, selectedTaskId: id }));
  }, []);

  const setTaskStatus = useCallback((id: string, status: TaskStatus) => {
    setSnapshot((prev) => ({
      ...prev,
      tasks: patchTask(prev.tasks, id, { status }),
    }));
  }, []);

  const saveEditedTitle = useCallback((id: string, title: string) => {
    const trimmed = title.trim();
    if (!trimmed) return;
    setSnapshot((prev) => ({
      ...prev,
      tasks: patchTask(prev.tasks, id, { proposedTitle: trimmed, status: "edited" }),
    }));
  }, []);

  const clearAnalysis = useCallback(() => {
    setSnapshot((prev) => ({
      ...emptySnapshot(),
      source: prev.source,
      exampleId: prev.exampleId,
    }));
  }, []);

  const counts = useMemo(() => computeReviewCounts(snapshot.tasks), [snapshot.tasks]);
  const selectedTask = useMemo(
    () => snapshot.tasks.find((t) => t.candidate.id === snapshot.selectedTaskId) ?? null,
    [snapshot.tasks, snapshot.selectedTaskId],
  );

  const value = useMemo<ReviewSessionValue>(
    () => ({
      snapshot,
      counts,
      selectedTask,
      setSource,
      setExampleId,
      loadExample,
      runAnalysis,
      selectTask,
      setTaskStatus,
      saveEditedTitle,
      clearAnalysis,
      phase: snapshot.phase,
    }),
    [
      snapshot,
      counts,
      selectedTask,
      setSource,
      setExampleId,
      loadExample,
      runAnalysis,
      selectTask,
      setTaskStatus,
      saveEditedTitle,
      clearAnalysis,
    ],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useReviewSession(): ReviewSessionValue {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useReviewSession must be used inside ReviewSessionProvider");
  return ctx;
}
