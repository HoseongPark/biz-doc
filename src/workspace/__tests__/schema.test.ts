import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { parse } from "yaml";
import { validateContext, nowStamp, DOMAIN_TYPES } from "../schema";

const sample = parse(
  readFileSync(join(__dirname, "fixtures", "swing-session.yml"), "utf-8")
);

describe("validateContext", () => {
  it("accepts the sample spec", () => {
    const r = validateContext(sample);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.spec.info.context.name).toBe("스윙 레코더 (Swing Recorder)");
      expect(Object.keys(r.spec.domain!)).toContain("SwingEvaluator");
      expect(r.spec.domain!["SwingEvaluator"].meta.identity.type).toBe("Service");
      expect(r.spec.domain!["SwingEvaluator"].operations![0]["related-domains"])
        .toEqual(["SwingSession", "SwingResult"]);
      expect(r.spec.relationships).toHaveLength(2);
    }
  });

  it("rejects unknown domain type", () => {
    const bad = structuredClone(sample);
    bad.domain.SwingSession.meta.identity.type = "Aggregate";
    const r = validateContext(bad);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors.join()).toContain("SwingSession");
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
      "Root Aggregate", "Entity", "Value", "Stereotype", "Service",
    ]);
  });
});
