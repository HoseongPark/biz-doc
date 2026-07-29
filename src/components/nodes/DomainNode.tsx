import { Handle, Position, useStore, type NodeProps } from "@xyflow/react";
import type { DomainSpec } from "../../workspace/schema";
import { useWorkspace } from "../../workspace/useWorkspace";
import { typeIcon, typeLabel, typeVar } from "../typeVisuals";
import { ZOOM_DETAIL, ZOOM_CONTEXT } from "../zoomLevels";

export default function DomainNode({ data }: NodeProps) {
  const d = data.domain as DomainSpec;
  const domainNames = (data.domainNames ?? {}) as Record<string, string>;
  const selection = useWorkspace((s) => s.selection);
  const zoom = useStore((s) => s.transform[2]);
  const t = d.type;
  const v = typeVar[t];
  const Icon = typeIcon[t];
  const isRoot = t === "AGGREGATE";
  // 스토어 선택만 기준으로 하이라이트 — React Flow 자체 선택 상태까지 보면
  // 캔버스 클릭 잔상과 탐색기 선택이 동시에 강조되는 문제가 생긴다.
  const isSelected = selection?.kind === "domain" && selection.domainId === d.id;

  // 시맨틱 줌: 축소 정도에 따라 상세 → 이름만 → 흐림(컨텍스트 레벨) 순으로 단순화
  if (zoom < ZOOM_DETAIL) {
    return (
      <div
        className={`domain-card simple ${isSelected ? "selected" : ""} ${zoom < ZOOM_CONTEXT ? "faded" : ""}`}
        style={{ borderColor: `var(--type-${v})`, borderWidth: isRoot ? 1.5 : 1 }}
      >
        <NodeHandles />
        <div className="simple-name" style={{ fontSize: `${Math.min(15 / zoom, 40)}px` }}>
          {d.meta.name}
        </div>
      </div>
    );
  }

  return (
    <div
      className={`domain-card ${isSelected ? "selected" : ""}`}
      style={{
        borderColor: `var(--type-${v})`,
        borderWidth: isRoot ? 1.5 : 1,
      }}
    >
      <NodeHandles />
      <div
        className="card-band"
        style={
          isRoot
            ? { background: "var(--accent)", color: "#fff" }
            : { background: `var(--type-${v}-soft)`, color: `var(--type-${v})` }
        }
      >
        <Icon size={12} />
        <span>{typeLabel[t]}</span>
      </div>
      <div className="card-head">
        <div className="card-title">{d.meta.name}</div>
      </div>
      {t === "STEREO" ? (
        <div className="card-rows">
          {(d.values ?? []).map((x) => (
            <div className="attr-row" key={x.name}>
              <span className="value-name mono">
                <i className="dot" style={{ background: `var(--type-${v})` }} />
                {x.name}
              </span>
              <span className="desc">{x.description}</span>
            </div>
          ))}
        </div>
      ) : t === "SERVICE" ? (
        <div className="card-rows">
          {(d.operations ?? []).map((op) => (
            <div className="op-row" key={op.name}>
              <span className="mono op-name">{op.name}</span>
              <span className="desc">{op.description}</span>
              {op["related-domains"] && (
                <span className="chips">
                  {op["related-domains"].map((rd) => (
                    <span className="chip" key={rd}>{domainNames[rd] ?? "(외부)"}</span>
                  ))}
                </span>
              )}
            </div>
          ))}
        </div>
      ) : (
        <>
          <div className="card-rows">
            {(d.attributes ?? []).map((a) => (
              <div className="attr-row" key={a.name}>
                <span>
                  <span className="mono attr-name">{a.name}</span>
                  <span className="desc block">{a.description}</span>
                </span>
                <span className="chip mono">{a.type}</span>
              </div>
            ))}
          </div>
          {(d["business-logic"] ?? []).length > 0 && (
            <div className="rule-section">
              <div className="rule-label">비즈니스 로직</div>
              {d["business-logic"]!.map((r) => (
                <div key={r.name}>
                  <div className="mono rule-name">{r.name}</div>
                  <div className="desc">{r.description}</div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

function NodeHandles() {
  return (
    <>
      <Handle type="target" position={Position.Top} id="tt" />
      <Handle type="target" position={Position.Bottom} id="tb" />
      <Handle type="target" position={Position.Left} id="tl" />
      <Handle type="target" position={Position.Right} id="tr" />
      <Handle type="source" position={Position.Top} id="st" />
      <Handle type="source" position={Position.Left} id="sl" />
      <Handle type="source" position={Position.Right} id="sr" />
      <Handle type="source" position={Position.Bottom} id="sb" />
    </>
  );
}
