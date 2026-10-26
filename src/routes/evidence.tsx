import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { ReactFlow, Background, Controls, MiniMap, type Node, type Edge } from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { PageHeader, Notice, SyntheticBadge } from "@/components/app-shell";
import { exampleInstructions } from "@/lib/synthetic-data";
import { draftTasks, splitSentences } from "@/lib/instruction-logic";
import { pageMeta } from "@/lib/seo";

export const Route = createFileRoute("/evidence")({
  head: () => pageMeta("Evidence Graph", "Trace each task back to its source document and sentence."),
  component: Evidence,
});

const nodeStyle = (kind: string) => ({
  fontSize: 11,
  width: 220,
  borderRadius: 6,
  border: "1px solid var(--border)",
  background: kind === "doc" ? "var(--sidebar)" : kind === "val" ? "var(--warning-soft)" : kind === "task" ? "var(--teal-soft)" : "var(--card)",
  color: kind === "doc" ? "var(--sidebar-foreground)" : "var(--foreground)",
});

function Evidence() {
  const [exId, setExId] = useState(exampleInstructions[0].id);
  const { nodes, edges } = useMemo(() => {
    const ex = exampleInstructions.find((e) => e.id === exId)!;
    const sentences = splitSentences(ex.text);
    const tasks = draftTasks(sentences);
    const nodes: Node[] = [{ id: "doc", position: { x: 0, y: (sentences.length * 90) / 2 }, data: { label: ex.title }, style: nodeStyle("doc") }];
    const edges: Edge[] = [];
    sentences.forEach((s, i) => {
      nodes.push({ id: s.id, position: { x: 280, y: i * 90 }, data: { label: `${s.id}: ${s.text}` }, style: nodeStyle("sent") });
      edges.push({ id: `e-doc-${s.id}`, source: "doc", target: s.id });
    });
    tasks.forEach((t, i) => {
      nodes.push({ id: t.id, position: { x: 560, y: i * 90 }, data: { label: `Task (${t.label})` }, style: nodeStyle("task") });
      edges.push({ id: `e-${t.sentenceId}-${t.id}`, source: t.sentenceId, target: t.id, animated: true });
      const vId = `v-${t.id}`;
      nodes.push({ id: vId, position: { x: 840, y: i * 90 }, data: { label: t.warnings.length ? `${t.warnings.length} warning(s)` : "No rule warnings" }, style: nodeStyle(t.warnings.length ? "val" : "sent") });
      edges.push({ id: `e-${t.id}-${vId}`, source: t.id, target: vId });
    });
    return { nodes, edges };
  }, [exId]);

  return (
    <>
      <PageHeader eyebrow="Traceability" title="Evidence Graph" description="Source document → sentences → tasks → validation results." actions={<SyntheticBadge />} />
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <label htmlFor="ex" className="eyebrow">Example</label>
        <select id="ex" value={exId} onChange={(e) => setExId(e.target.value)} className="rounded-md border border-input bg-card px-3 py-2 text-sm">
          {exampleInstructions.map((e) => <option key={e.id} value={e.id}>{e.title}</option>)}
        </select>
      </div>
      <div className="surface h-[600px] overflow-hidden">
        <ReactFlow nodes={nodes} edges={edges} fitView proOptions={{ hideAttribution: true }}>
          <Background />
          <Controls />
          <MiniMap pannable zoomable />
        </ReactFlow>
      </div>
      <div className="mt-4"><Notice>Validation nodes show placeholder rule warnings only. Real validation results will appear once the evaluation engine is connected.</Notice></div>
    </>
  );
}
