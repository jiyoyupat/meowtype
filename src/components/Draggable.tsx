import { useEffect, useRef, useState, type ReactNode } from "react";

type State = { x: number; y: number; s: number; r: number };

type Props = {
  storageKey: string;
  children: ReactNode;
  minScale?: number;
  maxScale?: number;
  hideChrome?: boolean;
  defaultState?: Partial<State>;
};

const SNAP = 8;
const ROT_SNAP = 5; // degrees

export default function Draggable({
  storageKey,
  children,
  minScale = 0.3,
  maxScale = 3,
  hideChrome = false,
  defaultState,
}: Props) {
  const [state, setState] = useState<State>(() => {
    const fallback: State = {
      x: defaultState?.x ?? 0,
      y: defaultState?.y ?? 0,
      s: defaultState?.s ?? 1,
      r: defaultState?.r ?? 0,
    };
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) {
        const parsed = JSON.parse(raw);
        return {
          x: parsed.x ?? fallback.x,
          y: parsed.y ?? fallback.y,
          s: parsed.s ?? fallback.s,
          r: parsed.r ?? fallback.r,
        };
      }
    } catch {
      // ignore
    }
    return fallback;
  });
  const [dragKind, setDragKind] = useState<
    null | "move" | "resize" | "rotate"
  >(null);
  const contentRef = useRef<HTMLDivElement | null>(null);
  const dragRef = useRef<{
    kind: "move" | "resize" | "rotate";
    start: State;
    mouse: { x: number; y: number };
    center?: { x: number; y: number };
    startAngle?: number;
  } | null>(null);

  const snap = (v: number) => (Math.abs(v) < SNAP ? 0 : v);
  const snappedX = Math.abs(state.x) < SNAP;
  const snappedY = Math.abs(state.y) < SNAP;

  useEffect(() => {
    if (!dragKind) return;
    const onMove = (e: MouseEvent) => {
      const d = dragRef.current;
      if (!d) return;
      if (d.kind === "move") {
        setState((prev) => ({
          ...prev,
          x: snap(d.start.x + (e.clientX - d.mouse.x)),
          y: snap(d.start.y + (e.clientY - d.mouse.y)),
        }));
      } else if (d.kind === "resize") {
        const dx = e.clientX - d.mouse.x;
        const dy = e.clientY - d.mouse.y;
        const delta = (dx + dy) / 300;
        const next = Math.max(minScale, Math.min(maxScale, d.start.s + delta));
        setState((prev) => ({ ...prev, s: next }));
      } else if (d.kind === "rotate" && d.center && d.startAngle !== undefined) {
        const curAngle =
          (Math.atan2(e.clientY - d.center.y, e.clientX - d.center.x) * 180) /
          Math.PI;
        let next = d.start.r + (curAngle - d.startAngle);
        // normalize to (-180, 180]
        next = ((((next + 180) % 360) + 360) % 360) - 180;
        // snap to 0/90/180/-90 within ROT_SNAP degrees
        for (const target of [-180, -90, 0, 90, 180]) {
          if (Math.abs(next - target) < ROT_SNAP) {
            next = target === -180 ? 180 : target;
            break;
          }
        }
        setState((prev) => ({ ...prev, r: next }));
      }
    };
    const onUp = () => setDragKind(null);
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, [dragKind, minScale, maxScale]);

  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(state));
    } catch {
      // ignore
    }
  }, [state, storageKey]);

  const startMove = (e: React.MouseEvent) => {
    e.preventDefault();
    dragRef.current = {
      kind: "move",
      start: state,
      mouse: { x: e.clientX, y: e.clientY },
    };
    setDragKind("move");
  };
  const startResize = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragRef.current = {
      kind: "resize",
      start: state,
      mouse: { x: e.clientX, y: e.clientY },
    };
    setDragKind("resize");
  };
  const startRotate = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const el = contentRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const startAngle =
      (Math.atan2(e.clientY - cy, e.clientX - cx) * 180) / Math.PI;
    dragRef.current = {
      kind: "rotate",
      start: state,
      mouse: { x: e.clientX, y: e.clientY },
      center: { x: cx, y: cy },
      startAngle,
    };
    setDragKind("rotate");
  };

  return (
    <div className="relative">
      {dragKind === "move" && (
        <>
          <div
            className={`absolute left-1/2 top-0 h-full w-0 border-l border-dashed pointer-events-none z-30 ${
              snappedX ? "border-main" : "border-sub/60"
            }`}
          />
          <div
            className={`absolute left-0 right-0 h-0 border-t border-dashed pointer-events-none z-30 ${
              snappedY ? "border-main" : "border-sub/60"
            }`}
            style={{ top: "50%" }}
          />
        </>
      )}
      <div className="flex justify-center">
        <div
          ref={contentRef}
          className={`relative group select-none ${
            dragKind === "move" ? "cursor-grabbing" : "cursor-grab"
          }`}
          style={{
            transform: `translate(${state.x}px, ${state.y}px) rotate(${state.r}deg) scale(${state.s})`,
            transformOrigin: "center",
          }}
          onMouseDown={startMove}
        >
          {children}
          {!hideChrome && (
            <>
              {/* rotate handle — small circle above center */}
              <div
                onMouseDown={startRotate}
                className="absolute -top-6 left-1/2 -translate-x-1/2 text-sub/60 opacity-0 group-hover:opacity-100 hover:!text-main transition-opacity"
                style={{ cursor: "grab" }}
                title="Drag to rotate"
              >
                <svg
                  viewBox="0 0 16 16"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  width="14"
                  height="14"
                >
                  <path d="M13 8a5 5 0 1 1-1.5-3.5" />
                  <path d="M13 3v3h-3" />
                </svg>
              </div>
              {/* resize handle — bottom-right corner */}
              <div
                onMouseDown={startResize}
                className="absolute -bottom-2 -right-2 text-sub/60 opacity-0 group-hover:opacity-100 hover:!text-main transition-opacity"
                style={{ cursor: "nwse-resize" }}
                title="Drag to resize"
              >
                <svg
                  viewBox="0 0 16 16"
                  fill="currentColor"
                  width="16"
                  height="16"
                >
                  <path d="M14 14 L14 8 L8 14 Z" />
                  <path d="M14 5 L14 2 L11 5 Z" opacity="0.5" />
                </svg>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
