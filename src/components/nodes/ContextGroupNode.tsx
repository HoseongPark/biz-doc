import { NodeResizer, useStore, type NodeProps } from "@xyflow/react";
import { Box } from "lucide-react";
import type { ContextSpec } from "../../workspace/schema";
import { useWorkspace } from "../../workspace/useWorkspace";
import { ZOOM_CONTEXT } from "../zoomLevels";

const SERVICE_BAND = 200; // 하단 서비스 구역 높이(px)

export default function ContextGroupNode({ id, selected, data }: NodeProps) {
  const spec = data.spec as ContextSpec;
  const saveNodeBox = useWorkspace((s) => s.saveNodeBox);
  const zoom = useStore((s) => s.transform[2]);
  // 시맨틱 줌: 컨텍스트 레벨까지 축소되면 구역 대신 컨텍스트 이름을 크게 보여준다
  const contextLevel = zoom < ZOOM_CONTEXT;
  return (
    <div className="ctx-box">
      <NodeResizer
        isVisible={selected}
        minWidth={480}
        minHeight={520}
        onResizeEnd={(_, params) =>
          void saveNodeBox(id, {
            x: params.x, y: params.y,
            width: params.width, height: params.height,
          })
        }
      />
      <div className="ctx-title">
        <Box size={15} color="var(--accent)" />
        <b>{spec.info.context.name}</b>
      </div>
      {contextLevel ? (
        <div className="ctx-big-name" style={{ fontSize: `${Math.min(24 / zoom, 120)}px` }}>
          {spec.info.context.name}
        </div>
      ) : (
        <>
          <div className="model-zone" style={{ bottom: SERVICE_BAND + 44 }}>
            <span className="zone-pill">모델</span>
          </div>
          <div className="service-zone" style={{ height: SERVICE_BAND }}>
            <span className="zone-pill">서비스</span>
          </div>
        </>
      )}
    </div>
  );
}
