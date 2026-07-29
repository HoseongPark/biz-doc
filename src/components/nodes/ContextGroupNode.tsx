import { useEffect, useState } from "react";
import { NodeResizer, useReactFlow, useStore, type NodeProps } from "@xyflow/react";
import { Box } from "lucide-react";
import type { ContextSpec } from "../../workspace/schema";
import { useWorkspace } from "../../workspace/useWorkspace";
import { DEFAULT_CTX_SIZE, DEFAULT_SERVICE_BAND } from "../ContextMap";
import { ZOOM_CONTEXT } from "../zoomLevels";

const MIN_SERVICE_BAND = 80; // 서비스 구역 최소 높이(px)
const MIN_MODEL_AREA = 200; // 모델 구역 최소 높이(px)

export default function ContextGroupNode({ id, selected, data, height }: NodeProps) {
  const spec = data.spec as ContextSpec;
  const savedBand = (data.band as number | undefined) ?? DEFAULT_SERVICE_BAND;
  const saveNodeBox = useWorkspace((s) => s.saveNodeBox);
  const saveZoneBand = useWorkspace((s) => s.saveZoneBand);
  const { getNodes } = useReactFlow();
  const zoom = useStore((s) => s.transform[2]);
  // 드래그 중에는 로컬 값으로 즉시 반영하고, 저장된 값이 갱신되면 로컬 값을 버린다
  const [dragBand, setDragBand] = useState<number | null>(null);
  useEffect(() => setDragBand(null), [savedBand]);
  const band = dragBand ?? savedBand;
  // 시맨틱 줌: 컨텍스트 레벨까지 축소되면 구역 대신 컨텍스트 이름을 크게 보여준다
  const contextLevel = zoom < ZOOM_CONTEXT;

  function onDividerPointerDown(e: React.PointerEvent<HTMLDivElement>) {
    e.preventDefault();
    e.stopPropagation();
    const startY = e.clientY;
    const startBand = band;
    const boxHeight = height ?? DEFAULT_CTX_SIZE.height;
    const maxBand = boxHeight - 76 - MIN_MODEL_AREA - 64;
    let latest = startBand;
    const onMove = (ev: PointerEvent) => {
      // 화면 px → 캔버스 px 변환(줌 반영). 위로 끌면 서비스 구역이 커진다.
      const delta = (startY - ev.clientY) / zoom;
      latest = Math.min(Math.max(startBand + delta, MIN_SERVICE_BAND), maxBand);
      setDragBand(latest);
    };
    const onUp = () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      void saveZoneBand(id, Math.round(latest));
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  }

  return (
    <div className="ctx-box">
      <NodeResizer
        isVisible={selected}
        minWidth={480}
        minHeight={520}
        onResizeEnd={(_, params) => {
          // 리사이즈 중 ContextMap이 자식 절대 위치를 보정하므로,
          // 보정된 자식 좌표도 함께 저장해야 리빌드 때 튀지 않는다.
          const children = Object.fromEntries(
            getNodes()
              .filter((n) => n.parentId === id)
              .map((n) => [n.id, { x: n.position.x, y: n.position.y }])
          );
          void saveNodeBox(
            id,
            { x: params.x, y: params.y, width: params.width, height: params.height },
            children
          );
        }}
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
          <div className="model-zone" style={{ bottom: band + 64 }}>
            <span className="zone-pill">모델</span>
          </div>
          <div
            className="zone-divider nodrag"
            title="드래그로 모델/서비스 구역 크기 조절"
            onPointerDown={onDividerPointerDown}
            style={{ bottom: band + 44 }}
          />
          <div className="service-zone" style={{ height: band }}>
            <span className="zone-pill">서비스</span>
          </div>
        </>
      )}
    </div>
  );
}
