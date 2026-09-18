import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type Dispatch,
  type ReactNode,
  type SetStateAction,
} from "react";
import {
  BONGO_MOOD_MODES,
  CARET_STYLES,
  FONT_FAMILIES,
  FONT_SCALE_MAX,
  FONT_SCALE_MIN,
  FONT_WEIGHTS,
  LETTER_SPACINGS,
  THEMES,
  type BongoMoodMode,
  type CaretStyle,
  type CustomColors,
  type FontFamily,
  type LetterSpacing,
  type Theme,
} from "../contexts/SettingsContext";

export default function AppearanceDropdown({
  items,
  extras,
  trigger,
}: {
  items: { label: string; value: boolean; onToggle: () => void }[];
  extras?: ReactNode;
  trigger?: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  // First-run hint: subtle callout drawing attention to the chevron so
  // users realize settings live under the "meowtype" logo. Dismissed on
  // first dropdown open OR when user clicks the callout close (×).
  const [showHint, setShowHint] = useState<boolean>(() => {
    try {
      return localStorage.getItem("settingsHintSeen") !== "1";
    } catch {
      return false;
    }
  });
  const dismissHint = useCallback(() => {
    setShowHint(false);
    try {
      localStorage.setItem("settingsHintSeen", "1");
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    if (!open) return;
    // Opening the dropdown counts as discovering settings.
    dismissHint();
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
  }, [open, dismissHint]);

  return (
    <div ref={wrapperRef} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="focus:outline-none cursor-pointer inline-flex items-center gap-1.5 group"
        title="Appearance"
      >
        {trigger ?? <span className="text-sub hover:text-text">appearance</span>}
        <svg
          width="10"
          height="10"
          viewBox="0 0 10 10"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={
            "group-hover:text-text transition-transform " +
            (showHint && !open ? "text-main animate-pulse " : "text-sub/60 ") +
            (open ? "rotate-180" : "rotate-0")
          }
          aria-hidden="true"
        >
          <path d="M2 3.5 L5 6.5 L8 3.5" />
        </svg>
      </button>
      {showHint && !open && (
        <div
          className="absolute top-full left-0 mt-2 z-40 pointer-events-none"
          role="tooltip"
        >
          {/* arrow pointing up to the chevron */}
          <div className="absolute -top-1 left-4 w-2 h-2 bg-main rotate-45" />
          <div className="pointer-events-auto flex items-center gap-2 px-3 py-1.5 bg-main text-bg text-xs rounded-md shadow-lg whitespace-nowrap">
            <span>settings, themes, bongo mood live here</span>
            <button
              onClick={(e) => {
                e.stopPropagation();
                dismissHint();
              }}
              className="text-bg/70 hover:text-bg leading-none text-sm"
              title="dismiss"
              aria-label="dismiss hint"
            >
              ×
            </button>
          </div>
        </div>
      )}
      {open && (
        <div className="absolute top-full mt-1 left-0 w-72 bg-bg border border-sub/30 rounded-md shadow-lg overflow-hidden z-50">
          {items.map((it) => (
            <button
              key={it.label}
              onClick={it.onToggle}
              className="flex items-center justify-between gap-4 w-full text-left px-3 py-1.5 text-sm whitespace-nowrap transition-colors hover:bg-sub/20"
            >
              <span className={it.value ? "text-main" : "text-sub"}>
                {it.label}
              </span>
              <span
                className={
                  "text-xs " + (it.value ? "text-main" : "text-sub/60")
                }
              >
                {it.value ? "on" : "off"}
              </span>
            </button>
          ))}
          {extras && (
            <>
              <div className="border-t border-sub/20" />
              {extras}
            </>
          )}
        </div>
      )}
    </div>
  );
}

export function ThemeSection({
  theme,
  setTheme,
  customColors,
  setCustomColors,
}: {
  theme: Theme;
  setTheme: Dispatch<SetStateAction<Theme>>;
  customColors: CustomColors;
  setCustomColors: Dispatch<SetStateAction<CustomColors>>;
}) {
  const [open, setOpen] = useState(false);
  const current = THEMES.find((t) => t.id === theme);
  const currentSwatch =
    theme === "custom" ? customColors.accent : current?.swatch;
  return (
    <div>
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center justify-between gap-4 w-full text-left px-3 py-1.5 text-sm whitespace-nowrap transition-colors hover:bg-sub/20"
      >
        <span className="flex items-center gap-2 text-sub">
          <span
            className="inline-block w-3 h-3 rounded-full border border-sub/40"
            style={{ backgroundColor: currentSwatch }}
          />
          theme
        </span>
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
            "text-sub/60 transition-transform " +
            (open ? "rotate-180" : "rotate-0")
          }
        >
          <path d="M2 3.5 L5 6.5 L8 3.5" />
        </svg>
      </button>
      {open && (
        <div className="px-3 py-2 border-t border-sub/20 bg-sub/5">
          <div className="grid grid-cols-1 gap-1">
            {THEMES.map((t) => (
              <button
                key={t.id}
                onClick={() => setTheme(t.id)}
                className={
                  "flex items-center gap-2 px-2 py-1 text-xs rounded transition-colors " +
                  (theme === t.id
                    ? "bg-main/20 text-main"
                    : "text-sub hover:text-text hover:bg-sub/10")
                }
                title={t.label}
              >
                <span
                  className="inline-block w-3 h-3 rounded-full border border-sub/40"
                  style={{
                    backgroundColor:
                      t.id === "custom" ? customColors.accent : t.swatch,
                  }}
                />
                <span className="truncate">{t.label}</span>
              </button>
            ))}
          </div>
          {theme === "custom" && (
            <div className="mt-2 pt-2 border-t border-sub/20 flex flex-col gap-1.5">
              <CustomColorRow
                label="bg"
                value={customColors.bg}
                onChange={(v) => setCustomColors((c) => ({ ...c, bg: v }))}
              />
              <CustomColorRow
                label="accent"
                value={customColors.accent}
                onChange={(v) => setCustomColors((c) => ({ ...c, accent: v }))}
              />
              <p className="text-[10px] text-sub/70 px-1 leading-snug">
                sub &amp; error di-derive otomatis
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function CustomColorRow({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <label className="flex items-center gap-2 px-1 text-xs text-sub">
      <input
        type="color"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-6 h-6 rounded border border-sub/40 bg-transparent cursor-pointer p-0"
        aria-label={`${label} color`}
      />
      <span className="w-12 shrink-0">{label}</span>
      <input
        type="text"
        value={value}
        onChange={(e) => {
          const v = e.target.value.trim();
          if (/^#?[0-9a-fA-F]{0,6}$/.test(v)) {
            const normalized = v.startsWith("#") ? v : `#${v}`;
            if (/^#[0-9a-fA-F]{6}$/.test(normalized)) onChange(normalized.toLowerCase());
          }
        }}
        placeholder="#000000"
        maxLength={7}
        className="flex-1 min-w-0 bg-transparent border border-sub/30 rounded px-1.5 py-0.5 text-xs font-mono focus:outline-none focus:border-main/60"
      />
    </label>
  );
}

export function TextStyleSection({
  fontScale,
  setFontScale,
  fontWeight,
  setFontWeight,
  letterSpacing,
  setLetterSpacing,
  fontFamily,
  setFontFamily,
}: {
  fontScale: number;
  setFontScale: Dispatch<SetStateAction<number>>;
  fontWeight: number;
  setFontWeight: Dispatch<SetStateAction<number>>;
  letterSpacing: LetterSpacing;
  setLetterSpacing: Dispatch<SetStateAction<LetterSpacing>>;
  fontFamily: FontFamily;
  setFontFamily: Dispatch<SetStateAction<FontFamily>>;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div>
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center justify-between gap-4 w-full text-left px-3 py-1.5 text-sm whitespace-nowrap transition-colors hover:bg-sub/20"
      >
        <span className="text-sub">text…</span>
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
            "text-sub/60 transition-transform " +
            (open ? "rotate-180" : "rotate-0")
          }
        >
          <path d="M2 3.5 L5 6.5 L8 3.5" />
        </svg>
      </button>
      {open && (
        <div className="px-3 py-2 space-y-2 border-t border-sub/20 bg-sub/5">
          {/* font family */}
          <div className="space-y-1">
            <div className="text-xs text-sub">font</div>
            <div className="grid grid-cols-2 gap-1">
              {FONT_FAMILIES.map((f) => (
                <button
                  key={f.id}
                  onClick={() => setFontFamily(f.id)}
                  style={{ fontFamily: f.css }}
                  className={
                    "px-2 py-1 text-xs rounded transition-colors truncate " +
                    (fontFamily === f.id
                      ? "bg-main/20 text-main"
                      : "text-sub hover:text-text hover:bg-sub/10")
                  }
                  title={f.label}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>
          {/* size */}
          <div className="space-y-1">
            <div className="flex items-center justify-between text-xs text-sub">
              <span>size</span>
              <span className="text-main">
                {Math.round(fontScale * 100)}%
              </span>
            </div>
            <input
              type="range"
              min={FONT_SCALE_MIN}
              max={FONT_SCALE_MAX}
              step={0.05}
              value={fontScale}
              onChange={(e) => setFontScale(Number(e.target.value))}
              className="w-full accent-main cursor-pointer"
            />
          </div>
          {/* weight */}
          <div className="space-y-1">
            <div className="text-xs text-sub">weight</div>
            <div className="flex gap-1">
              {FONT_WEIGHTS.map((w) => (
                <button
                  key={w}
                  onClick={() => setFontWeight(w)}
                  style={{ fontWeight: w }}
                  className={
                    "flex-1 px-2 py-1 text-xs rounded transition-colors " +
                    (fontWeight === w
                      ? "bg-main/20 text-main"
                      : "text-sub hover:text-text hover:bg-sub/10")
                  }
                >
                  {w}
                </button>
              ))}
            </div>
          </div>
          {/* letter spacing */}
          <div className="space-y-1">
            <div className="text-xs text-sub">spacing</div>
            <div className="flex gap-1">
              {LETTER_SPACINGS.map((s) => (
                <button
                  key={s}
                  onClick={() => setLetterSpacing(s)}
                  className={
                    "flex-1 px-2 py-1 text-xs rounded transition-colors " +
                    (letterSpacing === s
                      ? "bg-main/20 text-main"
                      : "text-sub hover:text-text hover:bg-sub/10")
                  }
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
          {/* reset */}
          <button
            onClick={() => {
              setFontScale(1);
              setFontWeight(400);
              setLetterSpacing("normal");
              setFontFamily("roboto-mono");
            }}
            className="w-full text-xs text-sub/60 hover:text-sub py-1 transition-colors"
          >
            reset
          </button>
        </div>
      )}
    </div>
  );
}

export function CaretSection({
  caretStyle,
  setCaretStyle,
  caretSmooth,
  setCaretSmooth,
}: {
  caretStyle: CaretStyle;
  setCaretStyle: Dispatch<SetStateAction<CaretStyle>>;
  caretSmooth: boolean;
  setCaretSmooth: Dispatch<SetStateAction<boolean>>;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div>
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center justify-between gap-4 w-full text-left px-3 py-1.5 text-sm whitespace-nowrap transition-colors hover:bg-sub/20"
      >
        <span className="text-sub">caret…</span>
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
            "text-sub/60 transition-transform " +
            (open ? "rotate-180" : "rotate-0")
          }
        >
          <path d="M2 3.5 L5 6.5 L8 3.5" />
        </svg>
      </button>
      {open && (
        <div className="px-3 py-2 space-y-2 border-t border-sub/20 bg-sub/5">
          {/* caret style */}
          <div className="space-y-1">
            <div className="text-xs text-sub">style</div>
            <div className="flex gap-1">
              {CARET_STYLES.map((s) => (
                <button
                  key={s}
                  onClick={() => setCaretStyle(s)}
                  className={
                    "flex-1 px-2 py-1 text-xs rounded transition-colors " +
                    (caretStyle === s
                      ? "bg-main/20 text-main"
                      : "text-sub hover:text-text hover:bg-sub/10")
                  }
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
          {/* caret smooth */}
          <div className="space-y-1">
            <div className="text-xs text-sub">smooth</div>
            <div className="flex gap-1">
              <button
                onClick={() => setCaretSmooth(true)}
                className={
                  "flex-1 px-2 py-1 text-xs rounded transition-colors " +
                  (caretSmooth
                    ? "bg-main/20 text-main"
                    : "text-sub hover:text-text hover:bg-sub/10")
                }
              >
                on
              </button>
              <button
                onClick={() => setCaretSmooth(false)}
                className={
                  "flex-1 px-2 py-1 text-xs rounded transition-colors " +
                  (!caretSmooth
                    ? "bg-main/20 text-main"
                    : "text-sub hover:text-text hover:bg-sub/10")
                }
              >
                off
              </button>
            </div>
          </div>
          {/* reset */}
          <button
            onClick={() => {
              setCaretStyle("bar");
              setCaretSmooth(true);
            }}
            className="w-full text-xs text-sub/60 hover:text-sub py-1 transition-colors"
          >
            reset
          </button>
        </div>
      )}
    </div>
  );
}

export function BongoSection({
  bongoMoodMode,
  setBongoMoodMode,
}: {
  bongoMoodMode: BongoMoodMode;
  setBongoMoodMode: Dispatch<SetStateAction<BongoMoodMode>>;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div>
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center justify-between gap-4 w-full text-left px-3 py-1.5 text-sm whitespace-nowrap transition-colors hover:bg-sub/20"
      >
        <span className="text-sub">bongo cat…</span>
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
            "text-sub/60 transition-transform " +
            (open ? "rotate-180" : "rotate-0")
          }
        >
          <path d="M2 3.5 L5 6.5 L8 3.5" />
        </svg>
      </button>
      {open && (
        <div className="px-3 py-2 space-y-2 border-t border-sub/20 bg-sub/5">
          <div className="space-y-1">
            <div
              className="text-xs text-sub"
              title="wpm: mood follows typing speed. time: mood follows how close you are to the end of the test."
            >
              mood source
            </div>
            <div className="flex gap-1">
              {BONGO_MOOD_MODES.map((m) => (
                <button
                  key={m}
                  onClick={() => setBongoMoodMode(m)}
                  className={
                    "flex-1 px-2 py-1 text-xs rounded transition-colors " +
                    (bongoMoodMode === m
                      ? "bg-main/20 text-main"
                      : "text-sub hover:text-text hover:bg-sub/10")
                  }
                >
                  {m}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
