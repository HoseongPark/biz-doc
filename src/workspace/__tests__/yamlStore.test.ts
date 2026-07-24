import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  parseContext, serializeContext, setDomainValue, addDomain,
  removeDomain, setRelationships, newContextText,
} from "../yamlStore";
import { validateContext } from "../schema";

const text = readFileSync(
  join(__dirname, "fixtures", "swing-session.yml"), "utf-8"
);

describe("round-trip", () => {
  it("re-serializes untouched document identically", () => {
    const { doc } = parseContext(text);
    expect(serializeContext(doc)).toBe(text);
  });
});

describe("setDomainValue", () => {
  it("updates a nested value and audit, preserving key order", () => {
    const { doc } = parseContext(text);
    setDomainValue(doc, "SwingSession", ["attributes", 0, "description"], "시작 시각");
    const out = serializeContext(doc);
    const { spec } = parseContext(out);
    expect(spec.domain!["SwingSession"].attributes![0].description).toBe("시작 시각");
    expect(spec.domain!["SwingSession"].meta.audit["updated-at"]).not.toBe(
      "2026-07-23 10:46:00"
    );
    // NOTE: deviates from task-4-brief.md verbatim text. The brief's regex
    // `out.match(/^  \w+:/gm)` matches every 2-space-indented `word:` line in
    // the whole document, which also catches `info.context:` and
    // `info.audit:` (same indent level as domain keys), producing 7 entries
    // instead of the intended 5 domain keys. Scoped to the `domain:` block so
    // the assertion tests what it says it tests (domain key order), without
    // weakening the guarantee.
    const domainBlock = out.slice(out.indexOf("\ndomain:"), out.indexOf("\nrelationships:"));
    const keys = domainBlock.match(/^  \w+:/gm)!.map((s) => s.trim());
    expect(keys).toEqual([
      "SwingSession:", "SwingRecorder:", "SwingInterval:",
      "SwingResult:", "SwingEvaluator:",
    ]);
  });
});

describe("addDomain / removeDomain", () => {
  it("appends a new domain at the end and removes it", () => {
    const { doc } = parseContext(text);
    addDomain(doc, "NewThing", {
      meta: {
        identity: { id: "0d4f7a1e-9b2c-4d3e-8f5a-6b7c8d9e0f1a", type: "Value" },
        name: "새 값",
        description: "테스트",
        audit: {
          author: "박호성",
          "created-at": "2026-07-24 12:00:00",
          "updated-at": "2026-07-24 12:00:00",
        },
      },
      attributes: [],
    });
    let spec = parseContext(serializeContext(doc)).spec;
    // NOTE: deviates from task-4-brief.md verbatim text. The brief uses
    // `.at(-1)`, which requires lib >= ES2022; this project's tsconfig.json
    // targets ES2021, so `tsc --noEmit` fails on it. Rewritten with plain
    // indexing to keep the tsc gate clean without touching the shared
    // tsconfig (out of scope for this task).
    const domainKeys = Object.keys(spec.domain!);
    expect(domainKeys[domainKeys.length - 1]).toBe("NewThing");
    removeDomain(doc, "NewThing");
    spec = parseContext(serializeContext(doc)).spec;
    expect(spec.domain!["NewThing"]).toBeUndefined();
  });
});

describe("setRelationships", () => {
  it("replaces the relationships list", () => {
    const { doc, spec } = parseContext(text);
    const rels = spec.relationships!.slice(0, 1);
    setRelationships(doc, rels);
    expect(parseContext(serializeContext(doc)).spec.relationships).toHaveLength(1);
  });
});

describe("newContextText", () => {
  it("creates a valid empty context", () => {
    const t = newContextText("주문", "박호성");
    const { spec } = parseContext(t);
    expect(spec.info.context.name).toBe("주문");
    expect(validateContext(spec).ok).toBe(true);
  });
});
