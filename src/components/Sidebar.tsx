import { useState } from "react";
import { Box, ChevronDown, ChevronRight } from "lucide-react";
import { useWorkspace } from "../workspace/useWorkspace";
import { typeIcon, typeVar } from "./typeVisuals";

const COLLAPSED_KEY = "sidebar:collapsed";

export default function Sidebar() {
  const contexts = useWorkspace((s) => s.contexts);
  const selection = useWorkspace((s) => s.selection);
  const select = useWorkspace((s) => s.select);
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(COLLAPSED_KEY) ?? "{}");
      return saved && typeof saved === "object" ? saved : {};
    } catch {
      return {};
    }
  });

  function toggleCollapsed(key: string) {
    setCollapsed((prev) => {
      const next = { ...prev, [key]: !(prev[key] ?? false) };
      localStorage.setItem(COLLAPSED_KEY, JSON.stringify(next));
      return next;
    });
  }

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
    const domains = ctx.spec.domains ?? [];
    const models = domains.filter((d) => d.type !== "SERVICE");
    const services = domains.filter((d) => d.type === "SERVICE");
    const isCollapsed = collapsed[fileName] ?? false;
    const Chevron = isCollapsed ? ChevronRight : ChevronDown;
    return (
      <div>
        <div
          className={`tree-row ${selection?.kind === "context" && selection.fileName === fileName ? "selected" : ""}`}
          onClick={() => select({ kind: "context", fileName })}
        >
          <Chevron
            size={12}
            color="var(--text-secondary)"
            onClick={(e) => {
              e.stopPropagation();
              toggleCollapsed(fileName);
            }}
          />
          <Box size={14} color="var(--accent)" />
          <b>{ctx.spec.info.context.name}</b>
        </div>
        {!isCollapsed && (
          <>
            <Group label="모델" groupKey={`${fileName}::models`} entries={models} />
            {services.length > 0 && (
              <Group label="서비스" groupKey={`${fileName}::services`} entries={services} />
            )}
          </>
        )}
      </div>
    );

    function Group({ label, groupKey, entries }: {
      label: string; groupKey: string; entries: typeof domains;
    }) {
      const isGroupCollapsed = collapsed[groupKey] ?? false;
      const GroupChevron = isGroupCollapsed ? ChevronRight : ChevronDown;
      return (
        <>
          <div className="tree-group" onClick={() => toggleCollapsed(groupKey)}>
            <GroupChevron size={11} />
            {label}
            <span className="tree-count">{entries.length}</span>
          </div>
          {!isGroupCollapsed &&
            entries.map((d) => {
              const Icon = typeIcon[d.type];
              const isSel =
                selection?.kind === "domain" &&
                selection.fileName === fileName &&
                selection.domainId === d.id;
              return (
                <div
                  key={d.id}
                  className={`tree-row domain ${isSel ? "selected" : ""}`}
                  onClick={() => select({ kind: "domain", fileName, domainId: d.id })}
                >
                  <Icon size={13} color={`var(--type-${typeVar[d.type]})`} />
                  {d.meta.name}
                </div>
              );
            })}
        </>
      );
    }
  }
}
