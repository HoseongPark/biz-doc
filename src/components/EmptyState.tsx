import { useEffect, useState } from "react";
import { FolderOpen } from "lucide-react";
import { open } from "@tauri-apps/plugin-dialog";
import { appConfigDir } from "@tauri-apps/api/path";
import { useWorkspace } from "../workspace/useWorkspace";
import { loadRecent, saveRecent } from "../workspace/workspaceService";

export async function openFolder(path?: string): Promise<void> {
  const target = path ?? (await open({ directory: true }));
  if (typeof target !== "string") return;
  const s = useWorkspace.getState();
  await s.openWorkspace(target);
  const cfg = await appConfigDir();
  const recent = await loadRecent(s.fs, cfg);
  await saveRecent(s.fs, cfg, [target, ...recent]);
}

export default function EmptyState() {
  const [recent, setRecent] = useState<string[]>([]);
  const fs = useWorkspace((s) => s.fs);

  useEffect(() => {
    appConfigDir().then((cfg) => loadRecent(fs, cfg)).then(setRecent).catch(() => {});
  }, [fs]);

  return (
    <div className="empty">
      <h2>워크스페이스를 열어주세요</h2>
      <p style={{ color: "var(--text-secondary)" }}>
        context/*.yml 명세가 있는 폴더를 선택하면 Context Map이 표시됩니다.
      </p>
      <button className="btn primary" onClick={() => openFolder()}>
        <FolderOpen size={13} /> 폴더 열기
      </button>
      {recent.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          {recent.map((p) => (
            <button key={p} className="btn" onClick={() => openFolder(p)}>
              {p}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
