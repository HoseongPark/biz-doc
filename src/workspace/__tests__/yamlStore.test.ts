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

const DOMAIN_IDS = [
  "234fc351-46d2-4a40-8717-19dd48198cd3", // 스윙 세션
  "e7676720-1be2-4e10-81d7-6ca56ae980f3", // 스윙 레코더
  "6a1d3f7e-2c48-4b0a-9f21-8d5c4e0b73aa", // 스윙 구간
  "942cf6fe-98ba-48cc-866f-6ce1b75b7da1", // 스윙 결과
  "b8d21c4a-5f0e-47d3-9c62-1e7a8f4d02b5", // 스윙 평가
];

describe("round-trip", () => {
  it("re-serializes untouched document identically", () => {
    const { doc } = parseContext(text);
    expect(serializeContext(doc)).toBe(text);
  });
});

describe("setDomainValue", () => {
  it("updates a nested value and audit, preserving domain order", () => {
    const { doc } = parseContext(text);
    setDomainValue(doc, 0, ["attributes", 0, "description"], "시작 시각");
    const out = serializeContext(doc);
    const { spec } = parseContext(out);
    expect(spec.domains![0].attributes![0].description).toBe("시작 시각");
    expect(spec.domains![0].meta.audit["updated-at"]).not.toBe(
      "2026-07-23 10:46:00"
    );
    expect(spec.domains!.map((d) => d.id)).toEqual(DOMAIN_IDS);
  });
});

describe("addDomain / removeDomain", () => {
  it("appends a new domain at the end and removes it", () => {
    const { doc } = parseContext(text);
    const newId = "0d4f7a1e-9b2c-4d3e-8f5a-6b7c8d9e0f1a";
    addDomain(doc, {
      id: newId,
      type: "VALUE",
      meta: {
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
    expect(spec.domains![spec.domains!.length - 1].id).toBe(newId);
    removeDomain(doc, spec.domains!.length - 1);
    spec = parseContext(serializeContext(doc)).spec;
    expect(spec.domains!.some((d) => d.id === newId)).toBe(false);
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
