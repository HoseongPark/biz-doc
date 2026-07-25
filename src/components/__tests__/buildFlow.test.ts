import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { buildFlow } from "../ContextMap";
import { parseContext } from "../../workspace/yamlStore";
import type { ContextFile, LayoutFile } from "../../workspace/workspaceService";

const sample = readFileSync(
  join(__dirname, "..", "..", "workspace", "__tests__", "fixtures", "swing-session.yml"),
  "utf-8"
);

function seedContexts(): ContextFile[] {
  const { doc, spec } = parseContext(sample);
  return [{ fileName: "swing-session.yml", doc, spec }];
}

const CTX_ID = "ctx:ff5817f0-aaef-4932-bd19-4b88b6ae74c7";
const SERVICE_DOM_ID = "dom:b8d21c4a-5f0e-47d3-9c62-1e7a8f4d02b5";

describe("buildFlow", () => {
  it("builds one context node with 5 domain children", () => {
    const emptyLayout: LayoutFile = { nodes: {} };
    const { nodes } = buildFlow(seedContexts(), emptyLayout);

    const ctxNodes = nodes.filter((n) => n.type === "context");
    expect(ctxNodes).toHaveLength(1);
    expect(ctxNodes[0].id).toBe(CTX_ID);

    const domNodes = nodes.filter((n) => n.type === "domain");
    expect(domNodes).toHaveLength(5);
    for (const n of domNodes) {
      expect(n.parentId).toBe(CTX_ID);
    }
  });

  it("gives the Service domain node a fallback y of 620", () => {
    const emptyLayout: LayoutFile = { nodes: {} };
    const { nodes } = buildFlow(seedContexts(), emptyLayout);
    const service = nodes.find((n) => n.id === SERVICE_DOM_ID)!;
    expect(service).toBeTruthy();
    expect(service.position.y).toBe(620);
  });

  it("builds 2 relationship edges with correct labels and endpoints", () => {
    const emptyLayout: LayoutFile = { nodes: {} };
    const { edges } = buildFlow(seedContexts(), emptyLayout);

    expect(edges).toHaveLength(2);

    const first = edges.find((e) => e.id === "rel:swing-session.yml:0")!;
    expect(first.label).toBe("포함됨");
    expect(first.source).toBe("dom:e7676720-1be2-4e10-81d7-6ca56ae980f3");
    expect(first.target).toBe("dom:234fc351-46d2-4a40-8717-19dd48198cd3");

    const second = edges.find((e) => e.id === "rel:swing-session.yml:1")!;
    expect(second.label).toBe("사용함");
    expect(second.source).toBe("dom:234fc351-46d2-4a40-8717-19dd48198cd3");
    expect(second.target).toBe("dom:6a1d3f7e-2c48-4b0a-9f21-8d5c4e0b73aa");
  });

  it("uses layout.nodes position override when present", () => {
    const layout: LayoutFile = {
      nodes: {
        [CTX_ID]: { x: 111, y: 222 },
        [SERVICE_DOM_ID]: { x: 333, y: 600 },
      },
    };
    const { nodes } = buildFlow(seedContexts(), layout);

    const ctxNode = nodes.find((n) => n.id === CTX_ID)!;
    expect(ctxNode.position).toEqual({ x: 111, y: 222 });

    const service = nodes.find((n) => n.id === SERVICE_DOM_ID)!;
    expect(service.position).toEqual({ x: 333, y: 600 });
  });

  it("applies a saved context size and derives zone extents from it", () => {
    const layout: LayoutFile = {
      nodes: {},
      sizes: { [CTX_ID]: { width: 1200, height: 1000 } },
    };
    const { nodes } = buildFlow(seedContexts(), layout);

    const ctxNode = nodes.find((n) => n.id === CTX_ID)!;
    expect(ctxNode.style).toMatchObject({ width: 1200, height: 1000 });

    const service = nodes.find((n) => n.id === SERVICE_DOM_ID)!;
    expect(service.extent).toEqual([[16, 788], [1184, 988]]);
  });

  it("clamps an out-of-zone saved position back into the type's zone", () => {
    // 서비스 노드가 모델 구역 좌표(y=444)에 저장돼 있어도 서비스 구역(y>=568)으로 보정된다
    const layout: LayoutFile = {
      nodes: { [SERVICE_DOM_ID]: { x: 333, y: 444 } },
    };
    const { nodes } = buildFlow(seedContexts(), layout);
    const service = nodes.find((n) => n.id === SERVICE_DOM_ID)!;
    expect(service.position).toEqual({ x: 333, y: 568 });
    expect(service.extent).toEqual([[16, 568], [864, 768]]);
  });
});
