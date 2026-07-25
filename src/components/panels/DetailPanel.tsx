import { useState } from "react";
import type { ReactNode } from "react";
import { ChevronUp, Plus, Trash2 } from "lucide-react";
import { useWorkspace } from "../../workspace/useWorkspace";
import { DOMAIN_TYPES } from "../../workspace/schema";
import type { Attribute, BusinessLogic, DomainType, Operation } from "../../workspace/schema";
import { typeLabel, typeVar } from "../typeVisuals";
import RelationshipPanel from "./RelationshipPanel";
import Dialog from "../Dialog";

export default function DetailPanel() {
  const selection = useWorkspace((s) => s.selection);
  if (!selection) return <aside className="detail empty-detail">선택된 항목 없음</aside>;
  return (
    <aside className="detail">
      {selection.kind === "domain" && (
        <DomainPanel
          key={`${selection.fileName}:${selection.domainId}`}
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

function DomainPanel({ fileName, domainId }: { fileName: string; domainId: string }) {
  const s = useWorkspace();
  const ctx = s.contexts.find((c) => c.fileName === fileName);
  const d = ctx?.spec.domains?.find((x) => x.id === domainId);
  if (!ctx || !d) return null;
  const t = d.type;
  const v = typeVar[t];
  const domains = ctx.spec.domains ?? [];
  const myRels = (ctx.spec.relationships ?? [])
    .map((r, i) => ({ r, i }))
    .filter(({ r }) =>
      [r.from["domain-id"], r.to["domain-id"]].includes(d.id)
    );

  return (
    <>
      <div className="panel-section">
        <div className="panel-title-row">
          <input
            className="panel-title"
            defaultValue={d.meta.name}
            key={`${domainId}-name-${d.meta.name}`}
            onBlur={(e) =>
              e.target.value !== d.meta.name &&
              void s.updateDomainMeta(fileName, domainId, { name: e.target.value })
            }
          />
          <span className="chip" style={{ background: `var(--type-${v}-soft)`, color: `var(--type-${v})` }}>
            {typeLabel[t]}
          </span>
        </div>
        <textarea
          defaultValue={d.meta.description ?? ""}
          key={`${domainId}-desc-${d.meta.description}`}
          rows={2}
          onBlur={(e) =>
            e.target.value !== (d.meta.description ?? "") &&
            void s.updateDomainMeta(fileName, domainId, { description: e.target.value })
          }
        />
      </div>

      {t !== "STEREO" && t !== "SERVICE" && (
        <AttributeSection fileName={fileName} domainId={domainId} attributes={d.attributes ?? []} />
      )}

      {t === "STEREO" && (
        <ListSection
          title="열거 값" items={d.values ?? []}
          render={(x, i) => (
            <SimpleNamedEditor key={`${domainId}-values-${i}-${x.name}`} item={x}
              onSave={(item) => void s.upsertValue(fileName, domainId, i, item)}
              onRemove={() => void s.removeValue(fileName, domainId, i)} />
          )}
          onAdd={() => void s.upsertValue(fileName, domainId, null, { name: "NEW", description: "" })}
          addLabel="값 추가"
        />
      )}

      {t === "SERVICE" && (
        <ListSection
          title="오퍼레이션" items={d.operations ?? []}
          render={(x, i) => (
            <OperationEditor key={`${domainId}-operations-${i}-${x.name}`} item={x}
              domainOptions={domains.filter((o) => o.id !== d.id).map((o) => ({ id: o.id, name: o.meta.name }))}
              onSave={(item) => void s.upsertOperation(fileName, domainId, i, item)}
              onRemove={() => void s.removeOperation(fileName, domainId, i)} />
          )}
          onAdd={() => void s.upsertOperation(fileName, domainId, null, { name: "newOp", description: "" })}
          addLabel="오퍼레이션 추가"
        />
      )}

      {t !== "STEREO" && t !== "SERVICE" && (
        <BusinessLogicSection fileName={fileName} domainId={domainId} items={d["business-logic"] ?? []} />
      )}

      <div className="panel-section">
        <h3>관계 <span className="desc">{myRels.length}개</span></h3>
        {myRels.map(({ r, i }) => (
          <button key={i} className="btn rel-item"
            onClick={() => s.select({ kind: "relationship", fileName, index: i })}>
            <span className="chip">{r.relationship}</span> →{" "}
            {domains.find(
              (x) => x.id ===
                (r.from["domain-id"] === d.id ? r.to["domain-id"] : r.from["domain-id"])
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
        await s.deleteDomain(fileName, domainId);
        s.select(null);
      }}>
        <Trash2 size={13} /> 도메인 삭제
      </button>
    </>
  );
}

function AttributeSection({ fileName, domainId, attributes }: {
  fileName: string; domainId: string; attributes: Attribute[];
}) {
  const s = useWorkspace();
  const [expanded, setExpanded] = useState<number | null>(null);

  return (
    <div className="panel-section">
      <h3>속성 <span className="desc">{attributes.length}개</span></h3>
      <div className="list-scroll">
        {attributes.map((a, i) =>
          expanded === i ? (
            <div className="attr-edit" key={`${domainId}-attributes-${i}-${a.name}`}>
              <div className="attr-edit-top">
                <input
                  className="mono" defaultValue={a.name} placeholder="name" autoFocus
                  onBlur={(e) =>
                    e.target.value !== a.name &&
                    void s.upsertAttribute(fileName, domainId, i, { ...a, name: e.target.value })
                  }
                />
                <input
                  className="mono chip-input" defaultValue={a.type} placeholder="type"
                  onBlur={(e) =>
                    e.target.value !== a.type &&
                    void s.upsertAttribute(fileName, domainId, i, { ...a, type: e.target.value })
                  }
                />
                <button className="icon-btn" title="접기" onClick={() => setExpanded(null)}>
                  <ChevronUp size={12} />
                </button>
                <button className="icon-btn" onClick={() => {
                  setExpanded(null);
                  void s.removeAttribute(fileName, domainId, i);
                }}>
                  <Trash2 size={12} />
                </button>
              </div>
              <input
                defaultValue={a.description ?? ""} placeholder="설명"
                onBlur={(e) =>
                  e.target.value !== (a.description ?? "") &&
                  void s.upsertAttribute(fileName, domainId, i, { ...a, description: e.target.value })
                }
              />
            </div>
          ) : (
            <div
              className="list-row"
              key={`${domainId}-attributes-${i}-${a.name}`}
              onClick={() => setExpanded(i)}
            >
              <span className="mono attr-name">{a.name}</span>
              <span className="desc ellipsis">{a.description}</span>
              <span className="chip mono">{a.type}</span>
            </div>
          )
        )}
      </div>
      <button className="btn soft" onClick={() => {
        setExpanded(attributes.length);
        void s.upsertAttribute(fileName, domainId, null, { name: "newAttr", type: "String", description: "" });
      }}>
        <Plus size={12} /> 속성 추가
      </button>
    </div>
  );
}

function BusinessLogicSection({ fileName, domainId, items }: {
  fileName: string; domainId: string; items: BusinessLogic[];
}) {
  const s = useWorkspace();
  const [expanded, setExpanded] = useState<number | null>(null);

  return (
    <div className="panel-section">
      <h3>비즈니스 로직 <span className="desc">{items.length}개</span></h3>
      <div className="list-scroll">
        {items.map((x, i) =>
          expanded === i ? (
            <div className="attr-edit" key={`${domainId}-business-logic-${i}-${x.name}`}>
              <div className="attr-edit-top">
                <input
                  className="mono" defaultValue={x.name} placeholder="name" autoFocus
                  onBlur={(e) =>
                    e.target.value !== x.name &&
                    void s.upsertLogic(fileName, domainId, i, { ...x, name: e.target.value })
                  }
                />
                <button className="icon-btn" title="접기" onClick={() => setExpanded(null)}>
                  <ChevronUp size={12} />
                </button>
                <button className="icon-btn" onClick={() => {
                  setExpanded(null);
                  void s.removeLogic(fileName, domainId, i);
                }}>
                  <Trash2 size={12} />
                </button>
              </div>
              <textarea
                defaultValue={x.description ?? ""} placeholder="설명" rows={3}
                onBlur={(e) =>
                  e.target.value !== (x.description ?? "") &&
                  void s.upsertLogic(fileName, domainId, i, { ...x, description: e.target.value })
                }
              />
            </div>
          ) : (
            <div
              className="list-row"
              key={`${domainId}-business-logic-${i}-${x.name}`}
              onClick={() => setExpanded(i)}
            >
              <span className="mono attr-name">{x.name}</span>
              <span className="desc ellipsis">{x.description}</span>
            </div>
          )
        )}
      </div>
      <button className="btn soft" onClick={() => {
        setExpanded(items.length);
        void s.upsertLogic(fileName, domainId, null, { name: "newRule", description: "" });
      }}>
        <Plus size={12} /> 로직 추가
      </button>
    </div>
  );
}

function ContextPanel({ fileName }: { fileName: string }) {
  const s = useWorkspace();
  const ctx = s.contexts.find((c) => c.fileName === fileName);
  if (!ctx) return null;
  const name = ctx.spec.info.context.name;
  return (
    <div className="panel-section">
      <h3>컨텍스트</h3>
      <input
        className="panel-title"
        defaultValue={name}
        key={fileName + name}
        onBlur={(e) =>
          e.target.value !== name &&
          void s.updateContextName(fileName, e.target.value)
        }
      />
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
  const [open, setOpen] = useState(false);
  return (
    <>
      <button className="btn" onClick={() => setOpen(true)}>
        <Plus size={13} /> 도메인 추가
      </button>
      {open && (
        <AddDomainDialog
          onClose={() => setOpen(false)}
          onCreate={async (name, type) => {
            const id = await s.addDomain(fileName, type, name);
            setOpen(false);
            s.select({ kind: "domain", fileName, domainId: id });
          }}
        />
      )}
    </>
  );
}

function AddDomainDialog({
  onClose, onCreate,
}: {
  onClose: () => void;
  onCreate: (name: string, type: DomainType) => Promise<void>;
}) {
  const [name, setName] = useState("");
  const [type, setType] = useState<DomainType>("ENTITY");
  const [error, setError] = useState("");

  async function handleSubmit() {
    if (!name.trim()) {
      setError("한글 이름을 입력해 주세요.");
      return;
    }
    try {
      await onCreate(name, type);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }

  return (
    <Dialog title="도메인 추가" onClose={onClose} onSubmit={handleSubmit} submitLabel="추가">
      <label>
        한글 이름
        <input value={name} onChange={(e) => setName(e.target.value)} autoFocus />
      </label>
      <label>
        유형
        <select value={type} onChange={(e) => setType(e.target.value as DomainType)}>
          {DOMAIN_TYPES.map((t) => (
            <option key={t} value={t}>{typeLabel[t]}</option>
          ))}
        </select>
      </label>
      {error && <div className="desc error">{error}</div>}
    </Dialog>
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

function OperationEditor({ item, domainOptions, onSave, onRemove }: {
  item: Operation;
  domainOptions: { id: string; name: string }[];
  onSave: (x: Operation) => void;
  onRemove: () => void;
}) {
  const relatedDomains = item["related-domains"] ?? [];

  function toggleRelated(id: string, checked: boolean) {
    const next = checked
      ? [...relatedDomains, id]
      : relatedDomains.filter((x) => x !== id);
    if (next.length === 0) {
      const { "related-domains": _omit, ...rest } = item;
      onSave(rest);
    } else {
      onSave({ ...item, "related-domains": next });
    }
  }

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
      <div className="rule-label">관련 도메인</div>
      {domainOptions.map((o) => (
        <label key={o.id} className="desc">
          <input
            type="checkbox"
            checked={relatedDomains.includes(o.id)}
            onChange={(e) => toggleRelated(o.id, e.target.checked)}
          />{" "}
          {o.name}
        </label>
      ))}
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
