import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { InMemoryFs } from "../fs";
import {
  loadWorkspace, saveContextFile, saveLayout, loadRecent, saveRecent,
} from "../workspaceService";
import { setDomainValue } from "../yamlStore";

const sample = readFileSync(
  join(__dirname, "fixtures", "swing-session.yml"), "utf-8"
);

function seedFs() {
  return new InMemoryFs({
    "/ws/context/swing-session.yml": sample,
    "/ws/context/broken.yml": "info: [unclosed",
    "/ws/.config/layout.json": JSON.stringify({ nodes: { abc: { x: 1, y: 2 } } }),
  });
}

describe("loadWorkspace", () => {
  it("loads valid contexts and reports broken ones", async () => {
    const { contexts, layout } = await loadWorkspace(seedFs(), "/ws");
    expect(contexts).toHaveLength(2);
    const ok = contexts.find((c) => c.fileName === "swing-session.yml")!;
    expect(ok.spec.info.context.name).toContain("스윙 레코더");
    const broken = contexts.find((c) => c.fileName === "broken.yml")!;
    expect(broken.error).toBeTruthy();
    expect(layout.nodes["abc"]).toEqual({ x: 1, y: 2 });
  });

  it("returns empty layout when .config/layout.json is missing", async () => {
    const fs = new InMemoryFs({ "/ws/context/swing-session.yml": sample });
    const { layout } = await loadWorkspace(fs, "/ws");
    expect(layout.nodes).toEqual({});
  });
});

describe("saveContextFile", () => {
  it("writes the mutated document back to disk", async () => {
    const fs = seedFs();
    const { contexts } = await loadWorkspace(fs, "/ws");
    const file = contexts.find((c) => c.fileName === "swing-session.yml")!;
    setDomainValue(file.doc, 0, ["meta", "description"], "변경됨");
    await saveContextFile(fs, "/ws", file);
    const written = await fs.readTextFile("/ws/context/swing-session.yml");
    expect(written).toContain("변경됨");
  });
});

describe("saveLayout / recent", () => {
  it("creates .config and persists layout", async () => {
    const fs = new InMemoryFs({ "/ws/context/swing-session.yml": sample });
    await saveLayout(fs, "/ws", { nodes: { n1: { x: 10, y: 20 } } });
    expect(JSON.parse(await fs.readTextFile("/ws/.config/layout.json")).nodes.n1)
      .toEqual({ x: 10, y: 20 });
  });

  it("keeps at most 5 recent paths, most recent first, deduped", async () => {
    const fs = new InMemoryFs({});
    await saveRecent(fs, "/cfg", ["a", "b", "c", "d", "e", "f"]);
    expect(await loadRecent(fs, "/cfg")).toEqual(["a", "b", "c", "d", "e"]);
    await saveRecent(fs, "/cfg", ["b", "a", "b"]);
    expect(await loadRecent(fs, "/cfg")).toEqual(["b", "a"]);
  });
});
