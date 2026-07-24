import { Box, ChevronDown } from "lucide-react";
import { useWorkspace } from "../workspace/useWorkspace";
import { typeIcon, typeVar } from "./typeVisuals";

export default function Sidebar() {
  const contexts = useWorkspace((s) => s.contexts);
  const selection = useWorkspace((s) => s.selection);
  const select = useWorkspace((s) => s.select);

  return (
    <nav className="sidebar">
      <div className="tree-caption">탐색기</div>
      {contexts.map((c) =>
        c.error ? (
          <div key={c.fileName} className="tree-row error" title={c.error}>
            <Box size={14} color="var(--danger)" /> {c.fileName} (파싱 오류)
          </div>
        ) : (
          <ContextTree key={c.fileName} fileName={c.fileName} />
        )
      )}
    </nav>
  );

  function ContextTree({ fileName }: { fileName: string }) {
    const ctx = contexts.find((c) => c.fileName === fileName)!;
    const domains = Object.entries(ctx.spec.domain ?? {});
    const models = domains.filter(([, d]) => d.meta.identity.type !== "Service");
    const services = domains.filter(([, d]) => d.meta.identity.type === "Service");
    return (
      <div>
        <div
          className={`tree-row ${selection?.kind === "context" && selection.fileName === fileName ? "selected" : ""}`}
          onClick={() => select({ kind: "context", fileName })}
        >
          <ChevronDown size={12} color="var(--text-secondary)" />
          <Box size={14} color="var(--accent)" />
          <b>{ctx.spec.info.context.name}</b>
        </div>
        <Group label="모델" entries={models} />
        {services.length > 0 && <Group label="서비스" entries={services} />}
      </div>
    );

    function Group({ label, entries }: { label: string; entries: typeof domains }) {
      return (
        <>
          <div className="tree-caption indent">{label}</div>
          {entries.map(([key, d]) => {
            const Icon = typeIcon[d.meta.identity.type];
            const isSel =
              selection?.kind === "domain" &&
              selection.fileName === fileName &&
              selection.domainKey === key;
            return (
              <div
                key={key}
                className={`tree-row domain ${isSel ? "selected" : ""}`}
                onClick={() => select({ kind: "domain", fileName, domainKey: key })}
              >
                <Icon size={13} color={`var(--type-${typeVar[d.meta.identity.type]})`} />
                {d.meta.name}
              </div>
            );
          })}
        </>
      );
    }
  }
}
