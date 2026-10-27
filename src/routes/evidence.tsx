import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { ReactFlow, Background, Controls, MiniMap, type Node, type Edge } from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { PageHeader, Notice, SyntheticBadge } from "@/components/app-shell";
import { exampleInstructions } from "@/lib/synthetic-data";
import { extractInstructions } from "@/lib/extraction";
import { formatTaskType } from "@/lib/review-state";
import { pageMeta } from "@/lib/seo";

export const Route = createFileRoute("/evidence")({
  head: () => pageMeta("Evidence Graph", "Trace each task back to its source document and sentence."),
  component: Evidence,
});

const nodeStyle = (kind: string) => ({
  fontSize: 11,
  width: 220,
  borderRadius: 4,
  padding: 10,
  fontFamily: "var(--font-sans)",
  borderLeft:
    kind === "task" ? "3px solid var(--primary)" : kind === "val" ? "3px solid var(--warning)" : "1px solid var(--border)",
  border: "1px solid var(--border)",
  background:
    kind === "doc"
      ? "var(--sidebar)"
      : kind === "val"
        ? "var(--warning-soft)"
        : kind === "task"
          ? "var(--teal-soft)"
          : "var(--card)",
  color: kind === "doc" ? "var(--sidebar-foreground)" : "var(--foreground)",
});

function Evidence() {
  const [exId, setExId] = useState(exampleInstructions[0]?.id ?? "");
  const { nodes, edges } = useMemo(() => {
    const ex = exampleInstructions.find((e) => e.id === exId)!;
    const result = extractInstructions(ex.text);
    const nodes: Node[] = [
      {
        id: "doc",
        position: { x: 0, y: (result.sentences.length * 90) / 2 },
        data: { label: ex.title },
        style: nodeStyle("doc"),
      },
    ];
    const edges: Edge[] = [];
    result.sentences.forEach((s, i) => {
      nodes.push({
        id: s.id,
        position: { x: 280, y: i * 90 },
        data: { label: `${s.id} [${s.span.start},${s.span.end}): ${s.text}` },
        style: nodeStyle("sent"),
      });
      edges.push({ id: `e-doc-${s.id}`, source: "doc", target: s.id });
    });
    result.candidates.forEach((t, i) => {
      nodes.push({
        id: t.id,
        position: { x: 560, y: i * 90 },
        data: { label: `${formatTaskType(t.type)} · ${t.ruleId}` },
        style: nodeStyle("task"),
      });
      edges.push({ id: `e-${t.sentenceId}-${t.id}`, source: t.sentenceId, target: t.id, animated: true });
      const vId = `v-${t.id}`;
      const nWarn = t.warnings.length;
      nodes.push({
        id: vId,
        position: { x: 840, y: i * 90 },
        data: { label: nWarn ? `${nWarn} warning(s)` : "No rule warnings" },
        style: nodeStyle(nWarn ? "val" : "sent"),
      });
      edges.push({ id: `e-${t.id}-${vId}`, source: t.id, target: vId });
    });
    return { nodes, edges };
  }, [exId]);

  return (
    <>
      <PageHeader
        eyebrow="02 · Traceability"
        title="Evidence Graph"
        description="Source document → sentences with offsets → engine candidates → validation warnings."
        actions={<SyntheticBadge />}
      />
      <div className="mb-4 flex flex-wrap gap-5 text-xs text-muted-foreground" aria-label="Legend">
        {(
          [
            ["bg-ink", "Source document"],
            ["bg-card border", "Sentence"],
            ["bg-teal-soft border-l-2 border-primary", "Task"],
            ["bg-warning-soft border-l-2 border-warning", "Validation"],
          ] as const
        ).map(([c, l]) => (
          <span key={l} className="inline-flex items-center gap-2">
            <span className={`h-3 w-5 rounded-sm ${c}`} />
            {l}
          </span>
        ))}
      </div>
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <label htmlFor="ex" className="eyebrow">
          Example
        </label>
        <select
          id="ex"
          value={exId}
          onChange={(e) => setExId(e.target.value)}
          className="rounded-md border border-input bg-card px-3 py-2 text-sm"
        >
          {exampleInstructions.map((e) => (
            <option key={e.id} value={e.id}>
              {e.title}
            </option>
          ))}
        </select>
      </div>
      <div className="h-[620px] overflow-hidden rounded-md border bg-card">
        <ReactFlow nodes={nodes} edges={edges} fitView proOptions={{ hideAttribution: true }}>
          <Background gap={24} color="var(--border)" />
          <Controls />
          <MiniMap pannable zoomable />
        </ReactFlow>
      </div>
      <div className="mt-4">
        <Notice>
          Graph nodes are produced by the deterministic extraction engine on fictional examples — not a mocked model response.
        </Notice>
      </div>
    </>
  );
}
