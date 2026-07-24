import { FolderOpen, Plus, RefreshCw } from "lucide-react";
import { useWorkspace } from "../workspace/useWorkspace";
import { openFolder } from "./EmptyState";

export default function TopBar() {
  const root = useWorkspace((s) => s.root);
  const refresh = useWorkspace((s) => s.refresh);
  const addContext = useWorkspace((s) => s.addContext);

  async function onAddContext() {
    const name = window.prompt("컨텍스트 이름 (한글)");
    if (!name) return;
    const fileName = window.prompt("파일명 (예: order.yml)");
    if (!fileName || !fileName.endsWith(".yml")) return;
    await addContext(fileName, name);
  }

  return (
    <header className="topbar">
      <span className="logo">biz-doc studio</span>
      {root && (
        <span className="ws-pill">
          <FolderOpen size={14} /> {root}
        </span>
      )}
      <span className="spacer" />
      <button className="btn" onClick={() => openFolder()}>
        <FolderOpen size={13} /> 폴더 열기
      </button>
      {root && (
        <>
          <button className="btn" onClick={refresh}>
            <RefreshCw size={13} /> 새로고침
          </button>
          <button className="btn primary" onClick={onAddContext}>
            <Plus size={13} /> 컨텍스트 추가
          </button>
        </>
      )}
    </header>
  );
}
