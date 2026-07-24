import type { NodeProps } from "@xyflow/react";
import { Box } from "lucide-react";
import type { ContextSpec } from "../../workspace/schema";

export default function ContextGroupNode({ data }: NodeProps) {
  const spec = data.spec as ContextSpec;
  return (
    <div className="ctx-box">
      <div className="ctx-title">
        <Box size={15} color="var(--accent)" />
        <b>{spec.info.context.name}</b>
        <span className="ctx-file mono">{data.fileName as string}</span>
      </div>
    </div>
  );
}
