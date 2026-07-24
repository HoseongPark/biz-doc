import { useEffect } from "react";
import type { ReactNode } from "react";

export default function Dialog({
  title, onClose, onSubmit, submitLabel = "확인", children,
}: {
  title: string;
  onClose: () => void;
  onSubmit: () => void;
  submitLabel?: string;
  children: ReactNode;
}) {
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  return (
    <div
      className="dialog-overlay"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <form
        className="dialog"
        onSubmit={(e) => {
          e.preventDefault();
          onSubmit();
        }}
      >
        <div className="dialog-title">{title}</div>
        {children}
        <div className="dialog-footer">
          <button type="button" className="btn" onClick={onClose}>
            취소
          </button>
          <button type="submit" className="btn primary">
            {submitLabel}
          </button>
        </div>
      </form>
    </div>
  );
}
