import { describe, it, expect, beforeEach } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { InMemoryFs } from "../fs";
import { useWorkspace } from "../useWorkspace";
import type { DomainType } from "../schema";

const sample = readFileSync(
  join(__dirname, "fixtures", "swing-session.yml"), "utf-8"
);
const FILE = "swing-session.yml";

const SESSION = "234fc351-46d2-4a40-8717-19dd48198cd3";
const RESULT = "942cf6fe-98ba-48cc-866f-6ce1b75b7da1";
const EVALUATOR = "b8d21c4a-5f0e-47d3-9c62-1e7a8f4d02b5";

let fs: InMemoryFs;

beforeEach(async () => {
  fs = new InMemoryFs({ "/ws/context/swing-session.yml": sample });
  useWorkspace.setState({ fs, root: null, contexts: [], layout: { nodes: {} }, selection: null });
  await useWorkspace.getState().openWorkspace("/ws");
});

const spec = () =>
  useWorkspace.getState().contexts.find((c) => c.fileName === FILE)!.spec;
const domain = (id: string) => spec().domains!.find((d) => d.id === id);
const written = () => fs.readTextFile("/ws/context/swing-session.yml");

describe("openWorkspace", () => {
  it("loads contexts", () => {
    expect(spec().info.context.name).toContain("스윙 레코더");
  });
});

describe("updateDomainMeta", () => {
  it("renames a domain and persists to disk", async () => {
    await useWorkspace.getState().updateDomainMeta(FILE, SESSION, { name: "세션" });
    expect(domain(SESSION)!.meta.name).toBe("세션");
    expect(await written()).toContain("name: 세션");
  });

  it("changes the domain type at the top level", async () => {
    await useWorkspace.getState().updateDomainMeta(FILE, SESSION, { type: "ENTITY" });
    expect(domain(SESSION)!.type).toBe("ENTITY");
    expect(await written()).toContain("type: ENTITY");
  });
});

describe("attribute CRUD", () => {
  it("appends, updates, removes", async () => {
    const s = useWorkspace.getState();
    await s.upsertAttribute(FILE, SESSION, null, {
      name: "place", type: "String", description: "장소",
    });
    expect(domain(SESSION)!.attributes).toHaveLength(3);
    await s.upsertAttribute(FILE, SESSION, 2, {
      name: "place", type: "String", description: "연습장",
    });
    expect(domain(SESSION)!.attributes![2].description).toBe("연습장");
    await s.removeAttribute(FILE, SESSION, 2);
    expect(domain(SESSION)!.attributes).toHaveLength(2);
  });
});

describe("addDomain", () => {
  it("creates a SERVICE with operations section and returns its id", async () => {
    const id = await useWorkspace.getState().addDomain(FILE, "SERVICE", "스윙 동기화");
    expect(id).toMatch(/^[0-9a-f-]{36}$/);
    const d = domain(id)!;
    expect(d.type).toBe("SERVICE");
    expect(d.operations).toEqual([]);
    expect(d.meta.audit.author).toBe("박호성");
    expect(spec().domains).toHaveLength(6);
  });
});

describe("commit rollback", () => {
  it("rejects an invalid edit and leaves disk content unchanged", async () => {
    const before = await written();
    await expect(
      useWorkspace.getState().updateDomainMeta(FILE, SESSION, {
        type: "Root Aggregate" as DomainType,
      })
    ).rejects.toThrow();
    expect(await written()).toBe(before);
  });

  it("does not block a subsequent valid edit (rollback works)", async () => {
    await expect(
      useWorkspace.getState().updateDomainMeta(FILE, SESSION, {
        type: "Root Aggregate" as DomainType,
      })
    ).rejects.toThrow();
    await useWorkspace.getState().updateDomainMeta(FILE, SESSION, { name: "세션" });
    expect(domain(SESSION)!.meta.name).toBe("세션");
    expect(await written()).toContain("name: 세션");
  });
});

describe("deleteDomain", () => {
  it("removes domain and its relationships", async () => {
    await useWorkspace.getState().deleteDomain(FILE, SESSION);
    expect(domain(SESSION)).toBeUndefined();
    expect(spec().relationships ?? []).toHaveLength(0);
  });
});

describe("relationships", () => {
  it("adds, renames, removes", async () => {
    const s = useWorkspace.getState();
    const end = (id: string) => ({
      "context-id": spec().info.context.id, "domain-id": id,
    });
    await s.addRelationship(FILE, {
      relationship: "산출함", from: end(SESSION), to: end(RESULT),
    });
    expect(spec().relationships).toHaveLength(3);
    await s.updateRelationship(FILE, 2, "생성함");
    expect(spec().relationships![2].relationship).toBe("생성함");
    await s.removeRelationship(FILE, 2);
    expect(spec().relationships).toHaveLength(2);
  });
});

describe("updateContextName", () => {
  it("renames the context name and persists to disk", async () => {
    const before = spec().info.audit["updated-at"];
    await useWorkspace.getState().updateContextName(FILE, "새이름");
    expect(spec().info.context.name).toBe("새이름");
    expect(await written()).toContain("name: 새이름");
    expect(spec().info.audit["updated-at"]).not.toBe(before);
  });

  it("preserves other content", async () => {
    const domainCountBefore = spec().domains!.length;
    await useWorkspace.getState().updateContextName(FILE, "새이름");
    expect(spec().domains!.length).toBe(domainCountBefore);
    expect(domain(SESSION)).toBeDefined();
  });
});

describe("upsertOperation related-domains", () => {
  it("round-trips related-domains to disk as a flow list of uuids", async () => {
    const s = useWorkspace.getState();
    const RECORDER = "e7676720-1be2-4e10-81d7-6ca56ae980f3";
    await s.upsertOperation(FILE, EVALUATOR, 0, {
      name: "evaluate",
      description: "스윙 세션의 기록들을 분석해 스윙 결과를 산출합니다.",
      "related-domains": [SESSION, RESULT, RECORDER],
    });
    expect(domain(EVALUATOR)!.operations![0]["related-domains"]).toEqual([
      SESSION, RESULT, RECORDER,
    ]);
    expect(await written()).toContain(
      `related-domains: [${SESSION}, ${RESULT}, ${RECORDER}]`
    );
  });

  it("removes the related-domains key when saved with an empty list", async () => {
    const s = useWorkspace.getState();
    await s.upsertOperation(FILE, EVALUATOR, 0, {
      name: "evaluate",
      description: "스윙 세션의 기록들을 분석해 스윙 결과를 산출합니다.",
    });
    expect(domain(EVALUATOR)!.operations![0]["related-domains"]).toBeUndefined();
    expect(await written()).not.toContain("related-domains");
  });
});

describe("addContext / deleteContext", () => {
  it("creates and deletes a context file", async () => {
    const s = useWorkspace.getState();
    await s.addContext("order.yml", "주문");
    expect(useWorkspace.getState().contexts.map((c) => c.fileName)).toContain("order.yml");
    expect(await fs.exists("/ws/context/order.yml")).toBe(true);
    await s.deleteContext("order.yml");
    expect(await fs.exists("/ws/context/order.yml")).toBe(false);
  });
});

describe("addContext duplicate fileName", () => {
  it("rejects and leaves disk content unchanged", async () => {
    const before = await written();
    await expect(
      useWorkspace.getState().addContext(FILE, "중복 컨텍스트")
    ).rejects.toThrow();
    expect(await written()).toBe(before);
  });
});

describe("saveNodePosition", () => {
  it("persists layout.json", async () => {
    await useWorkspace.getState().saveNodePosition("node-1", { x: 5, y: 9 });
    const layout = JSON.parse(await fs.readTextFile("/ws/.config/layout.json"));
    expect(layout.nodes["node-1"]).toEqual({ x: 5, y: 9 });
  });
});
