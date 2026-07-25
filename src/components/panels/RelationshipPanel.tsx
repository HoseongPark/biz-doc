import { Trash2 } from "lucide-react";
import { useWorkspace } from "../../workspace/useWorkspace";

export default function RelationshipPanel({
  fileName, index,
}: { fileName: string; index: number }) {
  const contexts = useWorkspace((s) => s.contexts);
  const updateRelationship = useWorkspace((s) => s.updateRelationship);
  const removeRelationship = useWorkspace((s) => s.removeRelationship);
  const select = useWorkspace((s) => s.select);

  const ctx = contexts.find((c) => c.fileName === fileName);
  const rel = ctx?.spec.relationships?.[index];
  if (!ctx || !rel) return null;

  const nameOf = (domainId: string) =>
    (ctx.spec.domains ?? []).find((d) => d.id === domainId)?.meta.name ?? domainId;

  return (
    <div className="panel-section">
      <h3>관계</h3>
      <div className="desc">
        {nameOf(rel.from["domain-id"])} → {nameOf(rel.to["domain-id"])}
      </div>
      <label>
        관계명
        <input
          defaultValue={rel.relationship}
          onBlur={(e) => {
            if (e.target.value && e.target.value !== rel.relationship)
              void updateRelationship(fileName, index, e.target.value);
          }}
        />
      </label>
      <button
        className="btn danger"
        onClick={async () => {
          await removeRelationship(fileName, index);
          select(null);
        }}
      >
        <Trash2 size={13} /> 관계 삭제
      </button>
    </div>
  );
}
