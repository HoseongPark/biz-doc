import {
  Component, Database, Diamond, List, Workflow, type LucideIcon,
} from "lucide-react";
import type { DomainType } from "../workspace/schema";

export const typeIcon: Record<DomainType, LucideIcon> = {
  "Root Aggregate": Database,
  Entity: Component,
  Value: Diamond,
  Stereotype: List,
  Service: Workflow,
};

export const typeVar: Record<DomainType, string> = {
  "Root Aggregate": "root",
  Entity: "entity",
  Value: "value",
  Stereotype: "stereotype",
  Service: "service",
};
// 사용: color: `var(--type-${typeVar[type]})`, 배경: `var(--type-${typeVar[type]}-soft)`
