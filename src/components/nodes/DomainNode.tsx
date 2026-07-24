import { Handle, Position, type NodeProps } from "@xyflow/react";
import type { DomainSpec } from "../../workspace/schema";

export default function DomainNode({ data }: NodeProps) {
  const d = data.domain as DomainSpec;
  return (
    <div className="domain-card">
      <Handle type="target" position={Position.Top} />
      <div style={{ padding: 8 }}>{d.meta.name}</div>
      <Handle type="source" position={Position.Bottom} />
    </div>
  );
}
