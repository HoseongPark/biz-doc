import {
  Component, Database, Diamond, List, Workflow, type LucideIcon,
} from "lucide-react";
import type { DomainType } from "../workspace/schema";

export const typeIcon: Record<DomainType, LucideIcon> = {
  AGGREGATE: Database,
  ENTITY: Component,
  VALUE: Diamond,
  STEREO: List,
  SERVICE: Workflow,
};

export const typeLabel: Record<DomainType, string> = {
  AGGREGATE: "Aggregate",
  ENTITY: "Entity",
  VALUE: "Value",
  STEREO: "Stereo",
  SERVICE: "Service",
};

export const typeVar: Record<DomainType, string> = {
  AGGREGATE: "root",
  ENTITY: "entity",
  VALUE: "value",
  STEREO: "stereotype",
  SERVICE: "service",
};
// 사용: color: `var(--type-${typeVar[type]})`, 배경: `var(--type-${typeVar[type]}-soft)`
