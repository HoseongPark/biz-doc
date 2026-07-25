
import { Document, parseDocument } from "yaml";
import {
  ContextSpec, DomainSpec, Relationship, validateContext, nowStamp,
} from "./schema";

export function parseContext(text: string): { doc: Document; spec: ContextSpec } {
  const doc = parseDocument(text);
  if (doc.errors.length) {
    throw new Error(doc.errors.map((e) => e.message).join("\n"));
  }
  const r = validateContext(doc.toJS());
  if (!r.ok) throw new Error(r.errors.join("\n"));
  return { doc, spec: r.spec };
}

export function serializeContext(doc: Document): string {
  return doc.toString({ lineWidth: 0, flowCollectionPadding: false });
}

function touchAudit(doc: Document, domainIndex: number): void {
  doc.setIn(["domains", domainIndex, "meta", "audit", "updated-at"], nowStamp());
}

export function setDomainValue(
  doc: Document, domainIndex: number,
  path: (string | number)[], value: unknown
): void {
  doc.setIn(["domains", domainIndex, ...path], value);
  touchAudit(doc, domainIndex);
}

export function deleteDomainValue(
  doc: Document, domainIndex: number, path: (string | number)[]
): void {
  doc.deleteIn(["domains", domainIndex, ...path]);
  touchAudit(doc, domainIndex);
}

export function addDomain(doc: Document, domain: DomainSpec): void {
  const existing = doc.getIn(["domains"]);
  if (existing === undefined || existing === null) {
    doc.setIn(["domains"], doc.createNode([]));
  }
  doc.addIn(["domains"], doc.createNode(domain));
}

export function removeDomain(doc: Document, domainIndex: number): void {
  doc.deleteIn(["domains", domainIndex]);
}

export function setRelationships(doc: Document, rels: Relationship[]): void {
  if (rels.length === 0) doc.setIn(["relationships"], doc.createNode([]));
  else doc.setIn(["relationships"], doc.createNode(rels));
}

export function newContextText(name: string, author: string): string {
  const stamp = nowStamp();
  const doc = new Document({
    info: {
      context: { id: crypto.randomUUID(), name },
      audit: { author, "created-at": stamp, "updated-at": stamp },
    },
    domains: [],
    relationships: [],
  });
  return serializeContext(doc);
}
