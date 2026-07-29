import "@fontsource/noto-sans-kr/400.css";
import "@fontsource/noto-sans-kr/500.css";
import "@fontsource/noto-sans-kr/700.css";
import "@fontsource/jetbrains-mono/400.css";
import "@fontsource/jetbrains-mono/600.css";
import "./styles/tokens.css";
import "./styles/app.css";
import { useEffect, useState } from "react";
import TopBar from "./components/TopBar";
import EmptyState from "./components/EmptyState";
import Sidebar from "./components/Sidebar";
import ContextMap from "./components/ContextMap";
import DetailPanel from "./components/panels/DetailPanel";
import ResizeHandle from "./components/ResizeHandle";
import { useWorkspace } from "./workspace/useWorkspace";

const clamp = (v: number, min: number, max: number) =>
  Math.min(max, Math.max(min, v));

const ZOOM_KEY = "app-zoom";
const ZOOM_MIN = 0.5;
const ZOOM_MAX = 2;
const ZOOM_STEP = 0.1;

function useAppZoom() {
  useEffect(() => {
    const apply = (zoom: number) => {
      document.documentElement.style.zoom = String(zoom);
      localStorage.setItem(ZOOM_KEY, String(zoom));
    };
    const saved = Number(localStorage.getItem(ZOOM_KEY));
    if (Number.isFinite(saved) && saved > 0) {
      apply(clamp(saved, ZOOM_MIN, ZOOM_MAX));
    }
    const onKeyDown = (e: KeyboardEvent) => {
      if (!(e.ctrlKey || e.metaKey) || e.altKey) return;
      const current = Number(document.documentElement.style.zoom) || 1;
      if (e.key === "+" || e.key === "=") {
        apply(clamp(Math.round((current + ZOOM_STEP) * 10) / 10, ZOOM_MIN, ZOOM_MAX));
      } else if (e.key === "-") {
        apply(clamp(Math.round((current - ZOOM_STEP) * 10) / 10, ZOOM_MIN, ZOOM_MAX));
      } else if (e.key === "0") {
        apply(1);
      } else {
        return;
      }
      e.preventDefault();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);
}

function usePanelOpen(key: string) {
  const [open, setOpen] = useState(() => localStorage.getItem(key) !== "false");
  return [
    open,
    () => {
      setOpen((prev) => {
        localStorage.setItem(key, String(!prev));
        return !prev;
      });
    },
  ] as const;
}

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
  useAppZoom();
  const [sidebarW, setSidebarW] = usePanelWidth("panel-w:sidebar", 240, 160, 480);
  const [detailW, setDetailW] = usePanelWidth("panel-w:detail", 300, 220, 600);
  const [sidebarOpen, toggleSidebar] = usePanelOpen("panel-open:sidebar");
  const [detailOpen, toggleDetail] = usePanelOpen("panel-open:detail");
  return (
    <div className="app">
      <TopBar
        sidebarOpen={sidebarOpen}
        detailOpen={detailOpen}
        onToggleSidebar={toggleSidebar}
        onToggleDetail={toggleDetail}
      />
      {root ? (
        <div
          className="body"
          style={{
            ["--sidebar-w" as string]: `${sidebarW}px`,
            ["--detail-w" as string]: `${detailW}px`,
          }}
        >
          {sidebarOpen && (
            <>
              <Sidebar />
              <ResizeHandle side="left" onResize={setSidebarW} />
            </>
          )}
          <ContextMap />
          {detailOpen && (
            <>
              <ResizeHandle side="right" onResize={setDetailW} />
              <DetailPanel />
            </>
          )}
        </div>
      ) : (
        <EmptyState />
      )}
    </div>
  );
}
