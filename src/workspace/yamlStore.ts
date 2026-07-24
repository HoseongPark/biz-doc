
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

function touchAudit(doc: Document, domainKey: string): void {
  doc.setIn(["domain", domainKey, "meta", "audit", "updated-at"], nowStamp());
}

export function setDomainValue(
  doc: Document, domainKey: string,
  path: (string | number)[], value: unknown
): void {
  doc.setIn(["domain", domainKey, ...path], value);
  touchAudit(doc, domainKey);
}

export function deleteDomainValue(
  doc: Document, domainKey: string, path: (string | number)[]
): void {
  doc.deleteIn(["domain", domainKey, ...path]);
  touchAudit(doc, domainKey);
}

export function addDomain(doc: Document, domainKey: string, domain: DomainSpec): void {
  doc.setIn(["domain", domainKey], doc.createNode(domain));
}

export function removeDomain(doc: Document, domainKey: string): void {
  doc.deleteIn(["domain", domainKey]);
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
    domain: {},
    relationships: [],
  });
  return serializeContext(doc);
}
