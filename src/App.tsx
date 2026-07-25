import "@fontsource/noto-sans-kr/400.css";
import "@fontsource/noto-sans-kr/500.css";
import "@fontsource/noto-sans-kr/700.css";
import "@fontsource/jetbrains-mono/400.css";
import "@fontsource/jetbrains-mono/600.css";
import "./styles/tokens.css";
import "./styles/app.css";
import { useState } from "react";
import TopBar from "./components/TopBar";
import EmptyState from "./components/EmptyState";
import Sidebar from "./components/Sidebar";
import ContextMap from "./components/ContextMap";
import DetailPanel from "./components/panels/DetailPanel";
import ResizeHandle from "./components/ResizeHandle";
import { useWorkspace } from "./workspace/useWorkspace";

const clamp = (v: number, min: number, max: number) =>
  Math.min(max, Math.max(min, v));

function usePanelWidth(key: string, initial: number, min: number, max: number) {
  const [width, setWidth] = useState(() => {
    const saved = Number(localStorage.getItem(key));
    return Number.isFinite(saved) && saved > 0 ? clamp(saved, min, max) : initial;
  });
  return [
    width,
    (w: number) => {
      const next = clamp(w, min, max);
      setWidth(next);
      localStorage.setItem(key, String(next));
    },
  ] as const;
}

export default function App() {
  const root = useWorkspace((s) => s.root);
  const [sidebarW, setSidebarW] = usePanelWidth("panel-w:sidebar", 240, 160, 480);
  const [detailW, setDetailW] = usePanelWidth("panel-w:detail", 300, 220, 600);
  return (
    <div className="app">
      <TopBar />
      {root ? (
        <div
          className="body"
          style={{
            ["--sidebar-w" as string]: `${sidebarW}px`,
            ["--detail-w" as string]: `${detailW}px`,
          }}
        >
          <Sidebar />
          <ResizeHandle side="left" onResize={setSidebarW} />
          <ContextMap />
          <ResizeHandle side="right" onResize={setDetailW} />
          <DetailPanel />
        </div>
      ) : (
        <EmptyState />
      )}
    </div>
  );
}
