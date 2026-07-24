import type { NodeProps } from "@xyflow/react";
import { Box } from "lucide-react";
import type { ContextSpec } from "../../workspace/schema";

const SERVICE_BAND = 200; // 하단 서비스 구역 높이(px)

export default function ContextGroupNode({ data }: NodeProps) {
  const spec = data.spec as ContextSpec;
  return (
    <div className="ctx-box">
      <div className="ctx-title">
        <Box size={15} color="var(--accent)" />
        <b>{spec.info.context.name}</b>
        <span className="ctx-file mono">{data.fileName as string}</span>
      </div>
      <div className="zone-label" style={{ left: 18, top: 48 }}>모델</div>
      <div className="service-zone" style={{ height: SERVICE_BAND }}>
        <div className="zone-label" style={{ color: "var(--type-service)" }}>서비스</div>
      </div>
    </div>
  );
}
