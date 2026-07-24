import { Handle, Position, type NodeProps } from "@xyflow/react";
import type { DomainSpec } from "../../workspace/schema";
import { typeIcon, typeVar } from "../typeVisuals";

export default function DomainNode({ data, selected }: NodeProps) {
  const d = data.domain as DomainSpec;
  const key = data.domainKey as string;
  const t = d.meta.identity.type;
  const v = typeVar[t];
  const Icon = typeIcon[t];
  const isRoot = t === "Root Aggregate";

  return (
    <div
      className="domain-card"
      style={{
        borderColor: `var(--type-${v})`,
        borderWidth: selected || isRoot ? 1.5 : 1,
      }}
    >
      <Handle type="target" position={Position.Top} />
      <div
        className="card-band"
        style={
          isRoot
            ? { background: "var(--accent)", color: "#fff" }
            : { background: `var(--type-${v}-soft)`, color: `var(--type-${v})` }
        }
      >
        <Icon size={12} />
        <span>{t}</span>
      </div>
      <div className="card-head">
        <div className="card-title">{d.meta.name}</div>
        <div className="card-sub mono">{key}</div>
      </div>
      {t === "Stereotype" ? (
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
      ) : t === "Service" ? (
        <div className="card-rows">
          {(d.operations ?? []).map((op) => (
            <div className="op-row" key={op.name}>
              <span className="mono op-name">{op.name}</span>
              <span className="desc">{op.description}</span>
              {op["related-domains"] && (
                <span className="chips">
                  {op["related-domains"].map((rd) => (
                    <span className="chip mono" key={rd}>{rd}</span>
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
      <Handle type="source" position={Position.Bottom} />
    </div>
  );
}
