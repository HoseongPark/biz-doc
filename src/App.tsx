import "@fontsource/noto-sans-kr/400.css";
import "@fontsource/noto-sans-kr/500.css";
import "@fontsource/noto-sans-kr/700.css";
import "@fontsource/jetbrains-mono/400.css";
import "@fontsource/jetbrains-mono/600.css";
import "./styles/tokens.css";
import "./styles/app.css";
import TopBar from "./components/TopBar";
import EmptyState from "./components/EmptyState";
import Sidebar from "./components/Sidebar";
import ContextMap from "./components/ContextMap";
import { useWorkspace } from "./workspace/useWorkspace";

export default function App() {
  const root = useWorkspace((s) => s.root);
  return (
    <div className="app">
      <TopBar />
      {root ? (
        <div className="body">
          <Sidebar />
          <ContextMap />
          <aside className="detail">상세 (Task 12)</aside>
        </div>
      ) : (
        <EmptyState />
      )}
    </div>
  );
}
