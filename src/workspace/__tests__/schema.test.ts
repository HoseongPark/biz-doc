import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { parse } from "yaml";
import { validateContext, nowStamp, DOMAIN_TYPES } from "../schema";

const sample = parse(
  readFileSync(join(__dirname, "fixtures", "swing-session.yml"), "utf-8")
);

const EVALUATOR = "b8d21c4a-5f0e-47d3-9c62-1e7a8f4d02b5";

describe("validateContext", () => {
  it("accepts the sample spec", () => {
    const r = validateContext(sample);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.spec.info.context.name).toBe("스윙 레코더 (Swing Recorder)");
      expect(r.spec.domains).toHaveLength(5);
      const evaluator = r.spec.domains!.find((d) => d.id === EVALUATOR)!;
      expect(evaluator.type).toBe("SERVICE");
      expect(evaluator.operations![0]["related-domains"]).toEqual([
        "234fc351-46d2-4a40-8717-19dd48198cd3",
        "942cf6fe-98ba-48cc-866f-6ce1b75b7da1",
      ]);
      expect(r.spec.relationships).toHaveLength(2);
    }
  });

  it("rejects unknown domain type", () => {
    const bad = structuredClone(sample);
    bad.domains[0].type = "Root Aggregate";
    const r = validateContext(bad);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors.join()).toContain("domains.0.type");
  });

  it("rejects non-uuid related-domains entries", () => {
    const bad = structuredClone(sample);
    bad.domains[4].operations[0]["related-domains"] = ["SwingSession"];
    expect(validateContext(bad).ok).toBe(false);
  });

  it("rejects missing info.context.id", () => {
    const bad = structuredClone(sample);
    delete bad.info.context.id;
    expect(validateContext(bad).ok).toBe(false);
  });
});

describe("nowStamp", () => {
  it("formats as YYYY-MM-DD HH:mm:ss", () => {
    expect(nowStamp()).toMatch(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/);
  });
});

describe("DOMAIN_TYPES", () => {
  it("has the five agreed types", () => {
    expect(DOMAIN_TYPES).toEqual([
      "AGGREGATE", "ENTITY", "VALUE", "STEREO", "SERVICE",
    ]);
  });
});
