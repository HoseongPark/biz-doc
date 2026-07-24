import type { ReactNode } from "react";
import { Plus, Trash2 } from "lucide-react";
import { useWorkspace } from "../../workspace/useWorkspace";
import { DOMAIN_TYPES } from "../../workspace/schema";
import type { DomainSpec, DomainType } from "../../workspace/schema";
import { typeVar } from "../typeVisuals";
import RelationshipPanel from "./RelationshipPanel";

export default function DetailPanel() {
  const selection = useWorkspace((s) => s.selection);
  if (!selection) return <aside className="detail empty-detail">선택된 항목 없음</aside>;
  return (
    <aside className="detail">
      {selection.kind === "domain" && (
        <DomainPanel
          key={`${selection.fileName}:${selection.domainKey}`}
          {...selection}
        />
      )}
      {selection.kind === "relationship" && (
        <RelationshipPanel
          key={`${selection.fileName}:${selection.index}`}
          fileName={selection.fileName}
          index={selection.index}
        />
      )}
      {selection.kind === "context" && <ContextPanel fileName={selection.fileName} />}
    </aside>
  );
}

function DomainPanel({ fileName, domainKey }: { fileName: string; domainKey: string }) {
  const s = useWorkspace();
  const ctx = s.contexts.find((c) => c.fileName === fileName);
  const d: DomainSpec | undefined = ctx?.spec.domain?.[domainKey];
  if (!ctx || !d) return null;
  const t = d.meta.identity.type;
  const v = typeVar[t];
  const myRels = (ctx.spec.relationships ?? [])
    .map((r, i) => ({ r, i }))
    .filter(({ r }) =>
      [r.from["domain-id"], r.to["domain-id"]].includes(d.meta.identity.id)
    );

  return (
    <>
      <div className="panel-section">
        <div className="panel-title-row">
          <input
            className="panel-title"
            defaultValue={d.meta.name}
            key={`${domainKey}-name-${d.meta.name}`}
            onBlur={(e) =>
              e.target.value !== d.meta.name &&
              void s.updateDomainMeta(fileName, domainKey, { name: e.target.value })
            }
          />
          <span className="chip" style={{ background: `var(--type-${v}-soft)`, color: `var(--type-${v})` }}>
            {t}
          </span>
        </div>
        <div className="mono desc">{domainKey}</div>
        <textarea
          defaultValue={d.meta.description ?? ""}
          key={`${domainKey}-desc-${d.meta.description}`}
          rows={2}
          onBlur={(e) =>
            e.target.value !== (d.meta.description ?? "") &&
            void s.updateDomainMeta(fileName, domainKey, { description: e.target.value })
          }
        />
      </div>

      {t !== "Stereotype" && t !== "Service" && (
        <ListSection
          title="속성" items={d.attributes ?? []}
          render={(a, i) => (
            <div className="attr-edit" key={`${domainKey}-attributes-${i}-${a.name}`}>
              <div className="attr-edit-top">
                <input
                  className="mono" defaultValue={a.name} placeholder="name"
                  onBlur={(e) =>
                    e.target.value !== a.name &&
                    void s.upsertAttribute(fileName, domainKey, i, { ...a, name: e.target.value })
                  }
                />
                <input
                  className="mono chip-input" defaultValue={a.type} placeholder="type"
                  onBlur={(e) =>
                    e.target.value !== a.type &&
                    void s.upsertAttribute(fileName, domainKey, i, { ...a, type: e.target.value })
                  }
                />
                <button className="icon-btn" onClick={() => void s.removeAttribute(fileName, domainKey, i)}>
                  <Trash2 size={12} />
                </button>
              </div>
              <input
                defaultValue={a.description ?? ""} placeholder="설명"
                onBlur={(e) =>
                  e.target.value !== (a.description ?? "") &&
                  void s.upsertAttribute(fileName, domainKey, i, { ...a, description: e.target.value })
                }
              />
            </div>
          )}
          onAdd={() =>
            void s.upsertAttribute(fileName, domainKey, null, { name: "newAttr", type: "String", description: "" })
          }
          addLabel="속성 추가"
        />
      )}

      {t === "Stereotype" && (
        <ListSection
          title="열거 값" items={d.values ?? []}
          render={(x, i) => (
            <SimpleNamedEditor key={`${domainKey}-values-${i}-${x.name}`} item={x}
              onSave={(item) => void s.upsertValue(fileName, domainKey, i, item)}
              onRemove={() => void s.removeValue(fileName, domainKey, i)} />
          )}
          onAdd={() => void s.upsertValue(fileName, domainKey, null, { name: "NEW", description: "" })}
          addLabel="값 추가"
        />
      )}

      {t === "Service" && (
        <ListSection
          title="오퍼레이션" items={d.operations ?? []}
          render={(x, i) => (
            <SimpleNamedEditor key={`${domainKey}-operations-${i}-${x.name}`} item={x}
              onSave={(item) => void s.upsertOperation(fileName, domainKey, i, { ...x, ...item })}
              onRemove={() => void s.removeOperation(fileName, domainKey, i)} />
          )}
          onAdd={() => void s.upsertOperation(fileName, domainKey, null, { name: "newOp", description: "" })}
          addLabel="오퍼레이션 추가"
        />
      )}

      {t !== "Stereotype" && t !== "Service" && (
        <ListSection
          title="비즈니스 로직" items={d["business-logic"] ?? []}
          render={(x, i) => (
            <SimpleNamedEditor key={`${domainKey}-business-logic-${i}-${x.name}`} item={x}
              onSave={(item) => void s.upsertLogic(fileName, domainKey, i, item)}
              onRemove={() => void s.removeLogic(fileName, domainKey, i)} />
          )}
          onAdd={() => void s.upsertLogic(fileName, domainKey, null, { name: "newRule", description: "" })}
          addLabel="로직 추가"
        />
      )}

      <div className="panel-section">
        <h3>관계 <span className="desc">{myRels.length}개</span></h3>
        {myRels.map(({ r, i }) => (
          <button key={i} className="btn rel-item"
            onClick={() => s.select({ kind: "relationship", fileName, index: i })}>
            <span className="chip">{r.relationship}</span> →{" "}
            {Object.values(ctx.spec.domain ?? {}).find(
              (x) => x.meta.identity.id ===
                (r.from["domain-id"] === d.meta.identity.id ? r.to["domain-id"] : r.from["domain-id"])
            )?.meta.name ?? "(외부)"}
          </button>
        ))}
      </div>

      <div className="spacer-v" />

      <div className="panel-section meta">
        <div className="rule-label">이력</div>
        <MetaRow k="작성자" v={d.meta.audit.author} />
        <MetaRow k="생성" v={d.meta.audit["created-at"]} />
        <MetaRow k="수정" v={d.meta.audit["updated-at"]} />
      </div>

      <button className="btn danger" onClick={async () => {
        if (!window.confirm(`도메인 "${d.meta.name}"을(를) 삭제할까요?`)) return;
        await s.deleteDomain(fileName, domainKey);
        s.select(null);
      }}>
        <Trash2 size={13} /> 도메인 삭제
      </button>
    </>
  );
}

function ContextPanel({ fileName }: { fileName: string }) {
  const s = useWorkspace();
  const ctx = s.contexts.find((c) => c.fileName === fileName);
  if (!ctx) return null;
  return (
    <div className="panel-section">
      <h3>컨텍스트</h3>
      <div className="panel-title">{ctx.spec.info.context.name}</div>
      <div className="mono desc">{fileName}</div>
      <AddDomainForm fileName={fileName} />
      <button className="btn danger" onClick={async () => {
        if (!window.confirm(`컨텍스트 파일 ${fileName}을(를) 삭제할까요?`)) return;
        await s.deleteContext(fileName);
        s.select(null);
      }}>
        <Trash2 size={13} /> 컨텍스트 삭제
      </button>
    </div>
  );
}

function AddDomainForm({ fileName }: { fileName: string }) {
  const s = useWorkspace();
  return (
    <button className="btn" onClick={() => {
      const key = window.prompt("도메인 키 (영문, 예: Order)");
      if (!key) return;
      const name = window.prompt("한글 이름");
      if (!name) return;
      const type = window.prompt(
        "유형: Root Aggregate | Entity | Value | Stereotype | Service", "Entity"
      );
      if (!type) return;
      if (!DOMAIN_TYPES.includes(type as DomainType)) {
        window.alert(`유형은 다음 중 하나여야 합니다: ${DOMAIN_TYPES.join(" | ")}`);
        return;
      }
      void s.addDomain(fileName, key, type as DomainType, name);
    }}>
      <Plus size={13} /> 도메인 추가
    </button>
  );
}

function ListSection<T>({ title, items, render, onAdd, addLabel }: {
  title: string; items: T[]; render: (item: T, i: number) => ReactNode;
  onAdd: () => void; addLabel: string;
}) {
  return (
    <div className="panel-section">
      <h3>{title} <span className="desc">{items.length}개</span></h3>
      {items.map(render)}
      <button className="btn soft" onClick={onAdd}>
        <Plus size={12} /> {addLabel}
      </button>
    </div>
  );
}

function SimpleNamedEditor({ item, onSave, onRemove }: {
  item: { name: string; description?: string };
  onSave: (x: { name: string; description?: string }) => void;
  onRemove: () => void;
}) {
  return (
    <div className="attr-edit">
      <div className="attr-edit-top">
        <input className="mono" defaultValue={item.name}
          onBlur={(e) => e.target.value !== item.name && onSave({ ...item, name: e.target.value })} />
        <button className="icon-btn" onClick={onRemove}><Trash2 size={12} /></button>
      </div>
      <input defaultValue={item.description ?? ""} placeholder="설명"
        onBlur={(e) =>
          e.target.value !== (item.description ?? "") && onSave({ ...item, description: e.target.value })
        } />
    </div>
  );
}

function MetaRow({ k, v }: { k: string; v: string }) {
  return (
    <div className="meta-row">
      <span className="desc">{k}</span>
      <span className="desc">{v}</span>
    </div>
  );
}
