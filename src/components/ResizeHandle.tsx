import { useCallback } from "react";

/** 드래그로 인접 패널 폭을 조절하는 세로 핸들. */
export default function ResizeHandle({
  onResize, side,
}: {
  /** 드래그 중 계산된 새 폭(px)을 전달 */
  onResize: (width: number) => void;
  /** 조절 대상 패널의 위치 — left면 핸들 왼쪽 패널, right면 오른쪽 패널 */
  side: "left" | "right";
}) {
  const onPointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      e.preventDefault();
      const target = e.currentTarget;
      target.setPointerCapture(e.pointerId);

      const onMove = (ev: PointerEvent) => {
        const width =
          side === "left" ? ev.clientX : window.innerWidth - ev.clientX;
        onResize(width);
      };
      const onUp = () => {
        target.releasePointerCapture(e.pointerId);
        window.removeEventListener("pointermove", onMove);
        window.removeEventListener("pointerup", onUp);
      };
      window.addEventListener("pointermove", onMove);
      window.addEventListener("pointerup", onUp);
    },
    [onResize, side]
  );

  return <div className="resize-handle" onPointerDown={onPointerDown} />;
}
