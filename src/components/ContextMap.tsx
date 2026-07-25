import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Background, Controls, ReactFlow, type Connection, type CoordinateExtent,
  type Edge, type Node, type NodeChange, applyNodeChanges,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { useWorkspace } from "../workspace/useWorkspace";
import type { Relationship } from "../workspace/schema";
import type { ContextFile, LayoutFile } from "../workspace/workspaceService";
import ContextGroupNode from "./nodes/ContextGroupNode";
import DomainNode from "./nodes/DomainNode";
import Dialog from "./Dialog";

interface PendingConnection {
  fileName: string;
  from: { "context-id": string; "domain-id": string };
  to: { "context-id": string; "domain-id": string };
}

const nodeTypes = { context: ContextGroupNode, domain: DomainNode };

export const DEFAULT_CTX_SIZE = { width: 880, height: 780 };

// 컨텍스트 박스 크기에 따른 구역 경계 — app.css의 .model-zone/.service-zone 및
// ContextGroupNode의 SERVICE_BAND(200)와 동기 유지.
// 부모(parentId)가 있는 노드의 extent 좌표는 부모 기준 상대 좌표다.
function zoneExtents(size: { width: number; height: number }): {
  model: CoordinateExtent; service: CoordinateExtent;
} {
  return {
    model: [[16, 76], [size.width - 16, size.height - 244]],
    service: [[16, size.height - 212], [size.width - 16, size.height - 12]],
  };
}

function clampToExtent(p: { x: number; y: number }, ext: CoordinateExtent) {
  return {
    x: Math.min(Math.max(p.x, ext[0][0]), ext[1][0]),
    y: Math.min(Math.max(p.y, ext[0][1]), ext[1][1]),
  };
}

export function buildFlow(
  contexts: ContextFile[], layout: LayoutFile
): { nodes: Node[]; edges: Edge[] } {
  const nodes: Node[] = [];
  const edges: Edge[] = [];
  // 도메인 노드의 절대 좌표 — 관계선이 가까운 핸들(상하좌우)로 붙도록 방향 판정에 사용
  const absPos: Record<string, { x: number; y: number }> = {};
  const relSets: { fileName: string; rels: Relationship[] }[] = [];
  let ctxX = 40;
  for (const c of contexts.filter((c) => !c.error)) {
    const ctxId = `ctx:${c.spec.info.context.id}`;
    const ctxPos = layout.nodes[ctxId] ?? { x: ctxX, y: 40 };
    const size = layout.sizes?.[ctxId] ?? DEFAULT_CTX_SIZE;
    ctxX += size.width + 60;
    const extents = zoneExtents(size);
    nodes.push({
      id: ctxId, type: "context", position: ctxPos,
      data: { fileName: c.fileName, spec: c.spec },
      style: { width: size.width, height: size.height, zIndex: -1 },
    });
    const domainNames = Object.fromEntries(
      (c.spec.domains ?? []).map((d) => [d.id, d.meta.name])
    );
    let i = 0;
    for (const d of c.spec.domains ?? []) {
      const domId = `dom:${d.id}`;
      const isService = d.type === "SERVICE";
      const extent = isService ? extents.service : extents.model;
      const fallback = isService
        ? { x: 36 + (i % 3) * 280, y: size.height - 160 }
        : { x: 40 + (i % 3) * 280, y: 80 + Math.floor(i / 3) * 260 };
      const position = clampToExtent(layout.nodes[domId] ?? fallback, extent);
      nodes.push({
        id: domId, type: "domain", parentId: ctxId, extent,
        position,
        data: { fileName: c.fileName, domainId: d.id, domain: d, domainNames },
      });
      absPos[domId] = { x: ctxPos.x + position.x, y: ctxPos.y + position.y };
      i++;
    }
    relSets.push({ fileName: c.fileName, rels: c.spec.relationships ?? [] });
  }
  // 엣지는 모든 노드 좌표를 수집한 뒤 생성 (다른 컨텍스트의 도메인 참조 대비)
  for (const { fileName, rels } of relSets) {
    rels.forEach((r, idx) => {
      const source = `dom:${r.from["domain-id"]}`;
      const target = `dom:${r.to["domain-id"]}`;
      // 두 노드의 상대 위치에서 우세한 축을 골라 마주 보는 핸들로 연결해
      // 선이 노드를 크게 우회해 영역 밖으로 나가지 않게 한다.
      const s = absPos[source] ?? { x: 0, y: 0 };
      const t = absPos[target] ?? { x: 0, y: 0 };
      const dx = t.x - s.x;
      const dy = t.y - s.y;
      const [sourceHandle, targetHandle] =
        Math.abs(dx) > Math.abs(dy)
          ? dx > 0 ? ["sr", "tl"] : ["sl", "tr"]
          : dy > 0 ? ["sb", "tt"] : ["st", "tb"];
      edges.push({
        id: `rel:${fileName}:${idx}`,
        source, target,
        sourceHandle, targetHandle,
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
  const selection = useWorkspace((s) => s.selection);
  const select = useWorkspace((s) => s.select);
  const saveNodePosition = useWorkspace((s) => s.saveNodePosition);
  const addRelationship = useWorkspace((s) => s.addRelationship);

  const [nodes, setNodes] = useState<Node[]>([]);
  const [pendingConnection, setPendingConnection] = useState<PendingConnection | null>(null);

  function findDomain(nodeId: string) {
    const domainId = nodeId.replace(/^dom:/, "");
    for (const c of contexts.filter((c) => !c.error)) {
      for (const d of c.spec.domains ?? []) {
        if (d.id === domainId)
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
      setPendingConnection({
        fileName: from.fileName,
        from: { "context-id": from.contextId, "domain-id": from.domainId },
        to: { "context-id": to.contextId, "domain-id": to.domainId },
      });
    },
    [contexts, addRelationship]
  );

  // Rebuild when contexts or context sizes change — position-only layout
  // changes are our own drag echoes and would otherwise stomp in-progress
  // node state (saveNodePosition keeps the same `sizes` reference).
  useEffect(() => {
    setNodes(buildFlow(contexts, layout).nodes);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contexts, layout.sizes]);

  // 선택된 관계: 엣지와 양 끝 노드를 깜빡여 연결을 드러낸다
  const selectedRel =
    selection?.kind === "relationship"
      ? { id: `rel:${selection.fileName}:${selection.index}` }
      : null;
  const flashNodeIds = useMemo(() => {
    if (selection?.kind !== "relationship") return new Set<string>();
    const ctx = contexts.find((c) => c.fileName === selection.fileName && !c.error);
    const rel = ctx?.spec.relationships?.[selection.index];
    if (!rel) return new Set<string>();
    return new Set([`dom:${rel.from["domain-id"]}`, `dom:${rel.to["domain-id"]}`]);
  }, [selection, contexts]);

  const edges = useMemo(() => {
    const built = buildFlow(contexts, layout).edges;
    if (!selectedRel) return built;
    return built.map((e) =>
      e.id === selectedRel.id ? { ...e, className: "edge-flash" } : e
    );
  }, [contexts, layout, selectedRel?.id]);

  const displayNodes = flashNodeIds.size
    ? nodes.map((n) =>
        flashNodeIds.has(n.id) ? { ...n, className: "node-flash" } : n
      )
    : nodes;

  return (
    <main className="canvas">
      <ReactFlow
        nodes={displayNodes}
        edges={edges}
        nodeTypes={nodeTypes}
        onNodesChange={(changes: NodeChange[]) =>
          setNodes((nds) => applyNodeChanges(changes, nds))
        }
        onNodeDragStop={(_, n) => void saveNodePosition(n.id, n.position)}
        onConnect={onConnect}
        onNodeClick={(_, n) => {
          if (n.type === "domain")
            select({ kind: "domain", fileName: n.data.fileName as string, domainId: n.data.domainId as string });
          else select({ kind: "context", fileName: n.data.fileName as string });
        }}
        onEdgeClick={(_, e) => {
          // 이미 선택된 관계선을 다시 클릭하면 선택(강조 효과)을 해제한다
          if (selectedRel?.id === e.id) {
            select(null);
            return;
          }
          const [, fileName, idx] = e.id.split(":");
          select({ kind: "relationship", fileName, index: Number(idx) });
        }}
        fitView
      >
        <Background />
        <Controls />
      </ReactFlow>
      {pendingConnection && (
        <RelationshipDialog
          onClose={() => setPendingConnection(null)}
          onCreate={async (label) => {
            await addRelationship(pendingConnection.fileName, {
              relationship: label,
              from: pendingConnection.from,
              to: pendingConnection.to,
            });
            setPendingConnection(null);
          }}
        />
      )}
    </main>
  );
}

function RelationshipDialog({
  onClose, onCreate,
}: {
  onClose: () => void;
  onCreate: (label: string) => Promise<void>;
}) {
  const [label, setLabel] = useState("");
  const [error, setError] = useState("");

  async function handleSubmit() {
    if (!label.trim()) {
      setError("관계명을 입력해 주세요.");
      return;
    }
    try {
      await onCreate(label);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }

  return (
    <Dialog title="관계 추가" onClose={onClose} onSubmit={handleSubmit} submitLabel="추가">
      <label>
        관계명 (예: 포함됨)
        <input value={label} onChange={(e) => setLabel(e.target.value)} autoFocus />
      </label>
      {error && <div className="desc error">{error}</div>}
    </Dialog>
  );
}
