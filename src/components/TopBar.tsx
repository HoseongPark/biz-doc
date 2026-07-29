import { useState } from "react";
import { FolderOpen, PanelLeft, PanelRight, Plus, RefreshCw } from "lucide-react";
import { useWorkspace } from "../workspace/useWorkspace";
import { openFolder } from "./EmptyState";
import Dialog from "./Dialog";

export default function TopBar({
  sidebarOpen, detailOpen, onToggleSidebar, onToggleDetail,
}: {
  sidebarOpen: boolean;
  detailOpen: boolean;
  onToggleSidebar: () => void;
  onToggleDetail: () => void;
}) {
  const root = useWorkspace((s) => s.root);
  const refresh = useWorkspace((s) => s.refresh);
  const addContext = useWorkspace((s) => s.addContext);
  const [dialogOpen, setDialogOpen] = useState(false);

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
          <button
            className={`btn icon${sidebarOpen ? " active" : ""}`}
            title={sidebarOpen ? "컨텍스트 목록 숨기기" : "컨텍스트 목록 표시"}
            aria-pressed={sidebarOpen}
            onClick={onToggleSidebar}
          >
            <PanelLeft size={13} />
          </button>
          <button
            className={`btn icon${detailOpen ? " active" : ""}`}
            title={detailOpen ? "상세 패널 숨기기" : "상세 패널 표시"}
            aria-pressed={detailOpen}
            onClick={onToggleDetail}
          >
            <PanelRight size={13} />
          </button>
          <button className="btn" onClick={refresh}>
            <RefreshCw size={13} /> 새로고침
          </button>
          <button className="btn primary" onClick={() => setDialogOpen(true)}>
            <Plus size={13} /> 컨텍스트 추가
          </button>
        </>
      )}
      {dialogOpen && (
        <AddContextDialog
          onClose={() => setDialogOpen(false)}
          onCreate={async (fileName, name) => {
            await addContext(fileName, name);
            setDialogOpen(false);
          }}
        />
      )}
    </header>
  );
}

function AddContextDialog({
  onClose, onCreate,
}: {
  onClose: () => void;
  onCreate: (fileName: string, name: string) => Promise<void>;
}) {
  const [name, setName] = useState("");
  const [fileName, setFileName] = useState("");
  const [error, setError] = useState("");

  async function handleSubmit() {
    if (!name.trim()) {
      setError("이름을 입력해 주세요.");
      return;
    }
    if (!fileName.trim() || !fileName.endsWith(".yml")) {
      setError("파일명은 비어있지 않아야 하며 .yml로 끝나야 합니다.");
      return;
    }
    try {
      await onCreate(fileName, name);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }

  return (
    <Dialog title="컨텍스트 추가" onClose={onClose} onSubmit={handleSubmit} submitLabel="추가">
      <label>
        이름 (한글)
        <input value={name} onChange={(e) => setName(e.target.value)} autoFocus />
      </label>
      <label>
        파일명 (예: order.yml)
        <input
          className="mono"
          value={fileName}
          onChange={(e) => setFileName(e.target.value)}
        />
      </label>
      {error && <div className="desc error">{error}</div>}
    </Dialog>
  );
}
