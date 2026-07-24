import { z } from "zod";

export const DOMAIN_TYPES = [
  "Root Aggregate",
  "Entity",
  "Value",
  "Stereotype",
  "Service",
] as const;
export type DomainType = (typeof DOMAIN_TYPES)[number];

const stampRe = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/;

const auditSchema = z.object({
  author: z.string(),
  "created-at": z.string().regex(stampRe),
  "updated-at": z.string().regex(stampRe),
});

const attributeSchema = z.object({
  name: z.string().min(1),
  type: z.string().min(1),
  description: z.string().optional(),
});

const namedSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
});

const operationSchema = namedSchema.extend({
  "related-domains": z.array(z.string()).optional(),
});

const domainSchema = z.object({
  meta: z.object({
    identity: z.object({
      id: z.string().uuid(),
      type: z.enum(DOMAIN_TYPES),
    }),
    name: z.string().min(1),
    description: z.string().optional(),
    audit: auditSchema,
  }),
  attributes: z.array(attributeSchema).optional(),
  "business-logic": z.array(namedSchema).optional(),
  values: z.array(namedSchema).optional(),
  operations: z.array(operationSchema).optional(),
});

const relationshipEndSchema = z.object({
  "context-id": z.string().uuid(),
  "domain-id": z.string().uuid(),
});

const relationshipSchema = z.object({
  from: relationshipEndSchema,
  to: relationshipEndSchema,
  relationship: z.string().min(1),
});

export const contextSchema = z.object({
  info: z.object({
    context: z.object({ id: z.string().uuid(), name: z.string().min(1) }),
    audit: auditSchema,
  }),
  domain: z.record(domainSchema).optional(),
  relationships: z.array(relationshipSchema).optional(),
});

export type Audit = z.infer<typeof auditSchema>;
export type Attribute = z.infer<typeof attributeSchema>;
export type BusinessLogic = z.infer<typeof namedSchema>;
export type EnumValue = z.infer<typeof namedSchema>;
export type Operation = z.infer<typeof operationSchema>;
export type DomainSpec = z.infer<typeof domainSchema>;
export type RelationshipEnd = z.infer<typeof relationshipEndSchema>;
export type Relationship = z.infer<typeof relationshipSchema>;
export type ContextSpec = z.infer<typeof contextSchema>;

export function validateContext(
  data: unknown
): { ok: true; spec: ContextSpec } | { ok: false; errors: string[] } {
  const r = contextSchema.safeParse(data);
  if (r.success) return { ok: true, spec: r.data };
  return {
    ok: false,
    errors: r.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`),
  };
}

export function nowStamp(d = new Date()): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(
    d.getHours()
  )}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
}
