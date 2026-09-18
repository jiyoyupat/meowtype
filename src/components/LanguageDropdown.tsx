import { useEffect, useRef, useState } from "react";

export default function LanguageDropdown<T extends string>({
  value,
  options,
  onChange,
  dropUp = false,
}: {
  value: T;
  options: readonly T[];
  onChange: (v: T) => void;
  dropUp?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const onClickOutside = (e: MouseEvent) => {
      if (!wrapperRef.current) return;
      if (!wrapperRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onClickOutside);
    document.addEventListener("keydown", onEsc);
    return () => {
      document.removeEventListener("mousedown", onClickOutside);
      document.removeEventListener("keydown", onEsc);
    };
  }, [open]);

  return (
    <div ref={wrapperRef} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="text-main hover:text-text transition-colors flex items-center gap-1 focus:outline-none"
        title="Language"
      >
        <span>{value}</span>
        <svg
          width="10"
          height="10"
          viewBox="0 0 10 10"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={
            "transition-transform " + (open ? "rotate-180" : "rotate-0")
          }
        >
          <path d="M2 3.5 L5 6.5 L8 3.5" />
        </svg>
      </button>
      {open && (
        <div
          className={
            "absolute left-0 min-w-full bg-bg border border-sub/30 rounded-md shadow-lg overflow-hidden z-50 " +
            (dropUp ? "bottom-full mb-1" : "top-full mt-1")
          }
        >
          {options.map((opt) => (
            <button
              key={opt}
              onClick={() => {
                onChange(opt);
                setOpen(false);
              }}
              className={
                "block w-full text-left px-3 py-1.5 text-sm whitespace-nowrap transition-colors hover:bg-sub/20 " +
                (opt === value ? "text-main" : "text-sub hover:text-text")
              }
            >
              {opt}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
