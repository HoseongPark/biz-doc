import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Background, Controls, ReactFlow, type Connection, type Edge, type Node,
  type NodeChange, applyNodeChanges,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { useWorkspace } from "../workspace/useWorkspace";
import type { ContextFile, LayoutFile } from "../workspace/workspaceService";
import ContextGroupNode from "./nodes/ContextGroupNode";
import DomainNode from "./nodes/DomainNode";

const nodeTypes = { context: ContextGroupNode, domain: DomainNode };

export function buildFlow(
  contexts: ContextFile[], layout: LayoutFile
): { nodes: Node[]; edges: Edge[] } {
  const nodes: Node[] = [];
  const edges: Edge[] = [];
  let ctxX = 40;
  for (const c of contexts.filter((c) => !c.error)) {
    const ctxId = `ctx:${c.spec.info.context.id}`;
    const ctxPos = layout.nodes[ctxId] ?? { x: ctxX, y: 40 };
    ctxX += 940;
    nodes.push({
      id: ctxId, type: "context", position: ctxPos,
      data: { fileName: c.fileName, spec: c.spec },
      style: { width: 880, height: 780, zIndex: -1 },
    });
    let i = 0;
    for (const [key, d] of Object.entries(c.spec.domain ?? {})) {
      const domId = `dom:${d.meta.identity.id}`;
      const isService = d.meta.identity.type === "Service";
      const fallback = isService
        ? { x: 36 + (i % 3) * 280, y: 620 }
        : { x: 40 + (i % 3) * 280, y: 80 + Math.floor(i / 3) * 260 };
      nodes.push({
        id: domId, type: "domain", parentId: ctxId, extent: "parent",
        position: layout.nodes[domId] ?? fallback,
        data: { fileName: c.fileName, domainKey: key, domain: d },
      });
      i++;
    }
    (c.spec.relationships ?? []).forEach((r, idx) => {
      edges.push({
        id: `rel:${c.fileName}:${idx}`,
        source: `dom:${r.from["domain-id"]}`,
        target: `dom:${r.to["domain-id"]}`,
        label: r.relationship,
        type: "smoothstep",
      });
    });
  }
  return { nodes, edges };
}

export default function ContextMap() {
  const contexts = useWorkspace((s) => s.contexts);
  const layout = useWorkspace((s) => s.layout);
  const select = useWorkspace((s) => s.select);
  const saveNodePosition = useWorkspace((s) => s.saveNodePosition);
  const addRelationship = useWorkspace((s) => s.addRelationship);

  const [nodes, setNodes] = useState<Node[]>([]);

  function findDomain(nodeId: string) {
    const domainId = nodeId.replace(/^dom:/, "");
    for (const c of contexts.filter((c) => !c.error)) {
      for (const d of Object.values(c.spec.domain ?? {})) {
        if (d.meta.identity.id === domainId)
          return { fileName: c.fileName, contextId: c.spec.info.context.id, domainId };
      }
    }
    return null;
  }

  const onConnect = useCallback(
    (conn: Connection) => {
      if (!conn.source || !conn.target) return;
      const from = findDomain(conn.source);
      const to = findDomain(conn.target);
      if (!from || !to) return;
      const label = window.prompt("관계명 (예: 포함됨)");
      if (!label) return;
      void addRelationship(from.fileName, {
        from: { "context-id": from.contextId, "domain-id": from.domainId },
        to: { "context-id": to.contextId, "domain-id": to.domainId },
        relationship: label,
      });
    },
    [contexts, addRelationship]
  );

  // Rebuild only when contexts change — layout changes are our own drag
  // echoes and would otherwise stomp in-progress node state.
  useEffect(() => {
    setNodes(buildFlow(contexts, layout).nodes);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contexts]);

  const edges = useMemo(() => buildFlow(contexts, layout).edges, [contexts, layout]);

  return (
    <main className="canvas">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        onNodesChange={(changes: NodeChange[]) =>
          setNodes((nds) => applyNodeChanges(changes, nds))
        }
        onNodeDragStop={(_, n) => void saveNodePosition(n.id, n.position)}
        onConnect={onConnect}
        onNodeClick={(_, n) => {
          if (n.type === "domain")
            select({ kind: "domain", fileName: n.data.fileName as string, domainKey: n.data.domainKey as string });
          else select({ kind: "context", fileName: n.data.fileName as string });
        }}
        onEdgeClick={(_, e) => {
          const [, fileName, idx] = e.id.split(":");
          select({ kind: "relationship", fileName, index: Number(idx) });
        }}
        fitView
      >
        <Background />
        <Controls />
      </ReactFlow>
    </main>
  );
}
