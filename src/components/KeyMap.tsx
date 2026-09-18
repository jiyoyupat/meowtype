import { useEffect, useRef, useState } from "react";

const ROWS: string[][] = [
  ["q", "w", "e", "r", "t", "y", "u", "i", "o", "p"],
  ["a", "s", "d", "f", "g", "h", "j", "k", "l"],
  ["z", "x", "c", "v", "b", "n", "m"],
];

export default function KeyMap({
  wrongKeys,
  expectedKey,
  shadowKey,
}: {
  wrongKeys?: Set<string>;
  // Bilingual: when the user's physical press matches `expectedKey` (the
  // source-language target char), display `shadowKey` (the English shadow
  // char) as the pressed key instead. Misses fall through as-is.
  expectedKey?: string;
  shadowKey?: string;
}) {
  const [pressed, setPressed] = useState<Set<string>>(new Set());
  const displayForPhysicalRef = useRef<Map<string, string>>(new Map());
  const expectedKeyRef = useRef(expectedKey);
  const shadowKeyRef = useRef(shadowKey);
  useEffect(() => {
    expectedKeyRef.current = expectedKey;
  }, [expectedKey]);
  useEffect(() => {
    shadowKeyRef.current = shadowKey;
  }, [shadowKey]);

  useEffect(() => {
    const onDown = (e: KeyboardEvent) => {
      const k = e.key.length === 1 ? e.key.toLowerCase() : e.key;
      const shadow = shadowKeyRef.current;
      const expected = expectedKeyRef.current;
      // Bilingual remap: only when the physical key equals the expected char.
      const shouldRemap =
        expected && k.length === 1 && k === expected;
      const display = shouldRemap ? shadow ?? expected! : k;
      displayForPhysicalRef.current.set(k, display);
      setPressed((prev) => {
        if (prev.has(display)) return prev;
        const next = new Set(prev);
        next.add(display);
        return next;
      });
    };
    const onUp = (e: KeyboardEvent) => {
      const k = e.key.length === 1 ? e.key.toLowerCase() : e.key;
      const display = displayForPhysicalRef.current.get(k) ?? k;
      displayForPhysicalRef.current.delete(k);
      setPressed((prev) => {
        if (!prev.has(display)) return prev;
        const next = new Set(prev);
        next.delete(display);
        return next;
      });
    };
    const onBlur = () => {
      displayForPhysicalRef.current.clear();
      setPressed(new Set());
    };
    document.addEventListener("keydown", onDown);
    document.addEventListener("keyup", onUp);
    window.addEventListener("blur", onBlur);
    return () => {
      document.removeEventListener("keydown", onDown);
      document.removeEventListener("keyup", onUp);
      window.removeEventListener("blur", onBlur);
    };
  }, []);

  return (
    <div className="flex flex-col items-center gap-[3px] select-none pointer-events-none">
      {ROWS.map((row, i) => (
        <div
          key={i}
          className="flex gap-[3px]"
          style={{ paddingLeft: i * 12 }}
        >
          {row.map((k) => (
            <Key key={k} label={k} active={pressed.has(k)} wrong={wrongKeys?.has(k)} />
          ))}
        </div>
      ))}
      <div className="flex gap-[3px] mt-[3px]">
        <Key label="space" active={pressed.has(" ")} wrong={wrongKeys?.has(" ")} width="w-48" />
      </div>
    </div>
  );
}

function Key({
  label,
  active,
  wrong,
  width,
}: {
  label: string;
  active: boolean;
  wrong?: boolean;
  width?: string;
}) {
  return (
    <div
      className={
        "flex items-center justify-center rounded text-[10px] font-medium h-6 transition-colors duration-75 " +
        (width ?? "w-6") +
        " " +
        (active
          ? (wrong ? "bg-error text-bg" : "bg-main text-bg")
          : "bg-sub/15 text-sub")
      }
    >
      {label}
    </div>
  );
}
