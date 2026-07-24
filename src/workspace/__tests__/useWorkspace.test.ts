import { describe, it, expect, beforeEach } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { InMemoryFs } from "../fs";
import { useWorkspace } from "../useWorkspace";

const sample = readFileSync(
  join(__dirname, "fixtures", "swing-session.yml"), "utf-8"
);
const FILE = "swing-session.yml";

let fs: InMemoryFs;

beforeEach(async () => {
  fs = new InMemoryFs({ "/ws/context/swing-session.yml": sample });
  useWorkspace.setState({ fs, root: null, contexts: [], layout: { nodes: {} }, selection: null });
  await useWorkspace.getState().openWorkspace("/ws");
});

const spec = () =>
  useWorkspace.getState().contexts.find((c) => c.fileName === FILE)!.spec;
const written = () => fs.readTextFile("/ws/context/swing-session.yml");

describe("openWorkspace", () => {
  it("loads contexts", () => {
    expect(spec().info.context.name).toContain("스윙 레코더");
  });
});

describe("updateDomainMeta", () => {
  it("renames a domain and persists to disk", async () => {
    await useWorkspace.getState().updateDomainMeta(FILE, "SwingSession", { name: "세션" });
    expect(spec().domain!["SwingSession"].meta.name).toBe("세션");
    expect(await written()).toContain("name: 세션");
  });
});

describe("attribute CRUD", () => {
  it("appends, updates, removes", async () => {
    const s = useWorkspace.getState();
    await s.upsertAttribute(FILE, "SwingSession", null, {
      name: "place", type: "String", description: "장소",
    });
    expect(spec().domain!["SwingSession"].attributes).toHaveLength(3);
    await s.upsertAttribute(FILE, "SwingSession", 2, {
      name: "place", type: "String", description: "연습장",
    });
    expect(spec().domain!["SwingSession"].attributes![2].description).toBe("연습장");
    await s.removeAttribute(FILE, "SwingSession", 2);
    expect(spec().domain!["SwingSession"].attributes).toHaveLength(2);
  });
});

describe("addDomain", () => {
  it("creates a Service with operations section", async () => {
    await useWorkspace.getState().addDomain(FILE, "SwingSync", "Service", "스윙 동기화");
    const d = spec().domain!["SwingSync"];
    expect(d.meta.identity.type).toBe("Service");
    expect(d.operations).toEqual([]);
    expect(d.meta.identity.id).toMatch(/^[0-9a-f-]{36}$/);
    expect(d.meta.audit.author).toBe("박호성");
  });
});

describe("addDomain duplicate key", () => {
  it("rejects and leaves disk content unchanged", async () => {
    const before = await written();
    await expect(
      useWorkspace.getState().addDomain(FILE, "SwingSession", "Entity", "중복")
    ).rejects.toThrow();
    expect(await written()).toBe(before);
  });

  it("does not block a subsequent valid edit (rollback works)", async () => {
    await expect(
      useWorkspace.getState().addDomain(FILE, "SwingSession", "Entity", "중복")
    ).rejects.toThrow();
    await useWorkspace.getState().updateDomainMeta(FILE, "SwingSession", { name: "세션" });
    expect(spec().domain!["SwingSession"].meta.name).toBe("세션");
    expect(await written()).toContain("name: 세션");
  });
});

describe("deleteDomain", () => {
  it("removes domain and its relationships", async () => {
    await useWorkspace.getState().deleteDomain(FILE, "SwingSession");
    expect(spec().domain!["SwingSession"]).toBeUndefined();
    expect(spec().relationships ?? []).toHaveLength(0);
  });
});

describe("relationships", () => {
  it("adds, renames, removes", async () => {
    const s = useWorkspace.getState();
    const end = (id: string) => ({
      "context-id": spec().info.context.id, "domain-id": id,
    });
    const sessionId = spec().domain!["SwingSession"].meta.identity.id;
    const resultId = spec().domain!["SwingResult"].meta.identity.id;
    await s.addRelationship(FILE, {
      from: end(sessionId), to: end(resultId), relationship: "산출함",
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
    const domainCountBefore = Object.keys(spec().domain ?? {}).length;
    await useWorkspace.getState().updateContextName(FILE, "새이름");
    expect(Object.keys(spec().domain ?? {}).length).toBe(domainCountBefore);
    expect(spec().domain!["SwingSession"]).toBeDefined();
  });
});

describe("upsertOperation related-domains", () => {
  it("round-trips related-domains to disk as a flow list", async () => {
    const s = useWorkspace.getState();
    await s.upsertOperation(FILE, "SwingEvaluator", 0, {
      name: "evaluate",
      description: "스윙 세션의 기록들을 분석해 스윙 결과를 산출합니다.",
      "related-domains": ["SwingSession", "SwingResult", "SwingRecorder"],
    });
    expect(spec().domain!["SwingEvaluator"].operations![0]["related-domains"]).toEqual([
      "SwingSession", "SwingResult", "SwingRecorder",
    ]);
    expect(await written()).toContain(
      "related-domains: [SwingSession, SwingResult, SwingRecorder]"
    );
  });

  it("removes the related-domains key when saved with an empty list", async () => {
    const s = useWorkspace.getState();
    await s.upsertOperation(FILE, "SwingEvaluator", 0, {
      name: "evaluate",
      description: "스윙 세션의 기록들을 분석해 스윙 결과를 산출합니다.",
    });
    expect(spec().domain!["SwingEvaluator"].operations![0]["related-domains"]).toBeUndefined();
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
