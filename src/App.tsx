import "@fontsource/noto-sans-kr/400.css";
import "@fontsource/noto-sans-kr/500.css";
import "@fontsource/noto-sans-kr/700.css";
import "@fontsource/jetbrains-mono/400.css";
import "@fontsource/jetbrains-mono/600.css";
import "./styles/tokens.css";
import "./styles/app.css";
import TopBar from "./components/TopBar";
import EmptyState from "./components/EmptyState";
import { useWorkspace } from "./workspace/useWorkspace";

export default function App() {
  const root = useWorkspace((s) => s.root);
  return (
    <div className="app">
      <TopBar />
      {root ? (
        <div className="body">
          <aside className="sidebar">탐색기 (Task 8)</aside>
          <main className="canvas" />
          <aside className="detail">상세 (Task 12)</aside>
        </div>
      ) : (
        <EmptyState />
      )}
    </div>
  );
}
