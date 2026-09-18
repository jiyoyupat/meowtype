import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type Dispatch,
  type ReactNode,
  type SetStateAction,
} from "react";
import type { Mode, TestConfig } from "../types";
import { LANGUAGES, type Language } from "../lib/words";

type SettingsCtx = {
  config: TestConfig;
  setMode: (m: Mode) => void;
  setAmount: (n: number) => void;
  setLanguage: (l: Language) => void;
  screenMode: boolean;
  setScreenMode: Dispatch<SetStateAction<boolean>>;
  tape: boolean;
  setTape: Dispatch<SetStateAction<boolean>>;
  showBongo: boolean;
  setShowBongo: Dispatch<SetStateAction<boolean>>;
  bongoMoodMode: BongoMoodMode;
  setBongoMoodMode: Dispatch<SetStateAction<BongoMoodMode>>;
  showKeyMap: boolean;
  setShowKeyMap: Dispatch<SetStateAction<boolean>>;
  showCounter: boolean;
  setShowCounter: Dispatch<SetStateAction<boolean>>;
  bilingual: boolean;
  setBilingual: Dispatch<SetStateAction<boolean>>;
  bilingualPopout: boolean;
  setBilingualPopout: Dispatch<SetStateAction<boolean>>;
  shadowLanguage: Language;
  setShadowLanguage: Dispatch<SetStateAction<Language>>;
  hardMode: boolean;
  setHardMode: Dispatch<SetStateAction<boolean>>;
  fontScale: number;
  setFontScale: Dispatch<SetStateAction<number>>;
  fontWeight: number;
  setFontWeight: Dispatch<SetStateAction<number>>;
  letterSpacing: LetterSpacing;
  setLetterSpacing: Dispatch<SetStateAction<LetterSpacing>>;
  caretStyle: CaretStyle;
  setCaretStyle: Dispatch<SetStateAction<CaretStyle>>;
  caretSmooth: boolean;
  setCaretSmooth: Dispatch<SetStateAction<boolean>>;
  fontFamily: FontFamily;
  setFontFamily: Dispatch<SetStateAction<FontFamily>>;
  theme: Theme;
  setTheme: Dispatch<SetStateAction<Theme>>;
  customColors: CustomColors;
  setCustomColors: Dispatch<SetStateAction<CustomColors>>;
  resetVersion: number;
  resetAppearance: () => void;
};

export type CustomColors = {
  bg: string;
  accent: string;
};

const DEFAULT_CUSTOM_COLORS: CustomColors = {
  bg: "#10262f",
  accent: "#d8d2c3",
};

export const DRAGGABLE_STORAGE_KEYS = [
  "bongoDraggable",
  "bilingualMirrorDraggable",
  "keymapDraggable",
] as const;

export const LETTER_SPACINGS = ["tight", "normal", "wide"] as const;
export type LetterSpacing = (typeof LETTER_SPACINGS)[number];
export const CARET_STYLES = ["bar", "underline", "block", "off"] as const;
export type CaretStyle = (typeof CARET_STYLES)[number];
export const BONGO_MOOD_MODES = ["wpm", "time"] as const;
export type BongoMoodMode = (typeof BONGO_MOOD_MODES)[number];
export const FONT_WEIGHTS = [300, 400, 500, 700] as const;
export const FONT_SCALE_MIN = 0.7;
export const FONT_SCALE_MAX = 2.0;

export const FONT_FAMILIES = [
  { id: "roboto-mono", label: "Roboto Mono", css: "'Roboto Mono', monospace" },
  { id: "jetbrains-mono", label: "JetBrains Mono", css: "'JetBrains Mono', monospace" },
  { id: "fira-code", label: "Fira Code", css: "'Fira Code', monospace" },
  { id: "ibm-plex-mono", label: "IBM Plex Mono", css: "'IBM Plex Mono', monospace" },
  { id: "source-code-pro", label: "Source Code Pro", css: "'Source Code Pro', monospace" },
  { id: "inconsolata", label: "Inconsolata", css: "'Inconsolata', monospace" },
  { id: "space-mono", label: "Space Mono", css: "'Space Mono', monospace" },
] as const;
export type FontFamily = (typeof FONT_FAMILIES)[number]["id"];

export const THEMES = [
  { id: "norse", label: "norse", swatch: "#d8d2c3" },
  { id: "dolch", label: "dolch", swatch: "#e6e6e1" },
  { id: "blot", label: "blot", swatch: "#5e0b19" },
  { id: "metropolis", label: "metropolis", swatch: "#00dfba" },
  { id: "fright-club", label: "fright club", swatch: "#b4fcdf" },
  { id: "rudy", label: "rudy", swatch: "#110a52" },
  { id: "black-snail", label: "black snail", swatch: "#f1e9d6" },
  { id: "inukuma", label: "inukuma", swatch: "#cab58f" },
  { id: "olivia", label: "olivia", swatch: "#dda791" },
  { id: "nerve", label: "nerve", swatch: "#550086" },
  { id: "custom", label: "custom", swatch: "#d8d2c3" },
] as const;
export type Theme = (typeof THEMES)[number]["id"];

const SettingsContext = createContext<SettingsCtx | null>(null);

function readBool(key: string, def: boolean): boolean {
  try {
    const v = localStorage.getItem(key);
    if (v === null) return def;
    return v === "1";
  } catch {
    return def;
  }
}

function writeBool(key: string, v: boolean): void {
  try {
    localStorage.setItem(key, v ? "1" : "0");
  } catch {
    // ignore
  }
}

function readNumber(key: string, def: number): number {
  try {
    const v = localStorage.getItem(key);
    if (v === null) return def;
    const n = Number(v);
    return Number.isFinite(n) ? n : def;
  } catch {
    return def;
  }
}

function writeNumber(key: string, v: number): void {
  try {
    localStorage.setItem(key, String(v));
  } catch {
    // ignore
  }
}

function readLetterSpacing(def: LetterSpacing): LetterSpacing {
  try {
    const v = localStorage.getItem("letterSpacing");
    if (v && (LETTER_SPACINGS as readonly string[]).includes(v))
      return v as LetterSpacing;
    return def;
  } catch {
    return def;
  }
}

function readCaretStyle(def: CaretStyle): CaretStyle {
  try {
    const v = localStorage.getItem("caretStyle");
    if (v && (CARET_STYLES as readonly string[]).includes(v))
      return v as CaretStyle;
    return def;
  } catch {
    return def;
  }
}

function readBongoMoodMode(def: BongoMoodMode): BongoMoodMode {
  try {
    const v = localStorage.getItem("bongoMoodMode");
    if (v && (BONGO_MOOD_MODES as readonly string[]).includes(v))
      return v as BongoMoodMode;
    return def;
  } catch {
    return def;
  }
}

function readFontFamily(def: FontFamily): FontFamily {
  try {
    const v = localStorage.getItem("fontFamily");
    if (v && FONT_FAMILIES.some((f) => f.id === v)) return v as FontFamily;
    return def;
  } catch {
    return def;
  }
}

function readTheme(def: Theme): Theme {
  try {
    const v = localStorage.getItem("theme");
    if (v && THEMES.some((t) => t.id === v)) return v as Theme;
    return def;
  } catch {
    return def;
  }
}

function isHex(v: string): boolean {
  return /^#[0-9a-fA-F]{6}$/.test(v);
}

function readCustomColors(def: CustomColors): CustomColors {
  try {
    const raw = localStorage.getItem("customColors");
    if (!raw) return def;
    const parsed = JSON.parse(raw) as Partial<CustomColors>;
    const bg = typeof parsed.bg === "string" && isHex(parsed.bg) ? parsed.bg : def.bg;
    const accent =
      typeof parsed.accent === "string" && isHex(parsed.accent) ? parsed.accent : def.accent;
    return { bg, accent };
  } catch {
    return def;
  }
}

/** Convert #rrggbb to "R G B" (space-separated channels for Tailwind alpha syntax). */
function hexToRgbTriplet(hex: string): string {
  const h = hex.replace("#", "");
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `${r} ${g} ${b}`;
}

/** Derive a mid-tone by mixing bg toward accent (Norse-analog for sub). */
function deriveSub(bgHex: string, accentHex: string, mix = 0.4): string {
  const bh = bgHex.replace("#", "");
  const ah = accentHex.replace("#", "");
  const br = parseInt(bh.slice(0, 2), 16);
  const bg = parseInt(bh.slice(2, 4), 16);
  const bb = parseInt(bh.slice(4, 6), 16);
  const ar = parseInt(ah.slice(0, 2), 16);
  const ag = parseInt(ah.slice(2, 4), 16);
  const ab = parseInt(ah.slice(4, 6), 16);
  const r = Math.round(br + (ar - br) * mix);
  const g = Math.round(bg + (ag - bg) * mix);
  const b = Math.round(bb + (ab - bb) * mix);
  return `${r} ${g} ${b}`;
}

function readLanguage(def: Language, key: string = "language"): Language {
  try {
    const v = localStorage.getItem(key);
    if (v && (LANGUAGES as string[]).includes(v)) return v as Language;
    return def;
  } catch {
    return def;
  }
}

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [config, setConfig] = useState<TestConfig>(() => ({
    mode: "time",
    amount: 30,
    language: readLanguage("english"),
  }));
  const [screenMode, setScreenMode] = useState<boolean>(() =>
    readBool("screenMode", false)
  );
  const [tape, setTape] = useState<boolean>(() => readBool("tapeMode", false));
  const [showBongo, setShowBongo] = useState<boolean>(() =>
    readBool("showBongo", false)
  );
  const [bongoMoodMode, setBongoMoodMode] = useState<BongoMoodMode>(() =>
    readBongoMoodMode("wpm")
  );
  const [showKeyMap, setShowKeyMap] = useState<boolean>(() =>
    readBool("showKeyMap", false)
  );
  const [showCounter, setShowCounter] = useState<boolean>(() =>
    readBool("showCounter", true)
  );
  const [bilingual, setBilingual] = useState<boolean>(() =>
    readBool("bilingual", false)
  );
  const [bilingualPopout, setBilingualPopout] = useState<boolean>(() =>
    readBool("bilingualPopout", false)
  );
  const [shadowLanguage, setShadowLanguage] = useState<Language>(() =>
    readLanguage("english", "shadowLanguage")
  );
  const [hardMode, setHardMode] = useState<boolean>(() =>
    readBool("hardMode", false)
  );
  const [fontScale, setFontScale] = useState<number>(() => {
    const v = readNumber("fontScale", 1);
    return Math.min(FONT_SCALE_MAX, Math.max(FONT_SCALE_MIN, v));
  });
  const [fontWeight, setFontWeight] = useState<number>(() => {
    const v = readNumber("fontWeight", 400);
    return (FONT_WEIGHTS as readonly number[]).includes(v) ? v : 400;
  });
  const [letterSpacing, setLetterSpacing] = useState<LetterSpacing>(() =>
    readLetterSpacing("normal")
  );
  const [caretStyle, setCaretStyle] = useState<CaretStyle>(() =>
    readCaretStyle("bar")
  );
  const [caretSmooth, setCaretSmooth] = useState<boolean>(() =>
    readBool("caretSmooth", true)
  );
  const [fontFamily, setFontFamily] = useState<FontFamily>(() =>
    readFontFamily("roboto-mono")
  );
  const [theme, setTheme] = useState<Theme>(() => readTheme("black-snail"));
  const [customColors, setCustomColors] = useState<CustomColors>(() =>
    readCustomColors(DEFAULT_CUSTOM_COLORS)
  );
  const [resetVersion, setResetVersion] = useState(0);

  const resetAppearance = useCallback(() => {
    // toggles
    setTape(false);
    setShowBongo(false);
    setBongoMoodMode("wpm");
    setShowKeyMap(false);
    setShowCounter(true);
    // text styling
    setFontScale(1);
    setFontWeight(400);
    setLetterSpacing("normal");
    setCaretStyle("bar");
    setCaretSmooth(true);
    setFontFamily("roboto-mono");
    // theme
    setTheme("black-snail");
    // clear draggable positions
    try {
      DRAGGABLE_STORAGE_KEYS.forEach((k) => localStorage.removeItem(k));
    } catch {
      // ignore
    }
    // force-remount draggables so they re-read (now empty) storage
    setResetVersion((v) => v + 1);
  }, []);

  useEffect(() => writeBool("screenMode", screenMode), [screenMode]);
  useEffect(() => writeBool("tapeMode", tape), [tape]);
  useEffect(() => writeBool("showBongo", showBongo), [showBongo]);
  useEffect(() => {
    try {
      localStorage.setItem("bongoMoodMode", bongoMoodMode);
    } catch {
      // ignore
    }
  }, [bongoMoodMode]);
  useEffect(() => writeBool("showKeyMap", showKeyMap), [showKeyMap]);
  useEffect(() => writeBool("showCounter", showCounter), [showCounter]);
  useEffect(() => writeBool("bilingual", bilingual), [bilingual]);
  useEffect(() => writeBool("bilingualPopout", bilingualPopout), [bilingualPopout]);
  useEffect(() => {
    try {
      localStorage.setItem("shadowLanguage", shadowLanguage);
    } catch {
      // ignore
    }
  }, [shadowLanguage]);
  useEffect(() => writeBool("hardMode", hardMode), [hardMode]);
  useEffect(() => writeNumber("fontScale", fontScale), [fontScale]);
  useEffect(() => writeNumber("fontWeight", fontWeight), [fontWeight]);
  useEffect(() => {
    try {
      localStorage.setItem("letterSpacing", letterSpacing);
    } catch {
      // ignore
    }
  }, [letterSpacing]);
  useEffect(() => {
    try {
      localStorage.setItem("caretStyle", caretStyle);
    } catch {
      // ignore
    }
  }, [caretStyle]);
  useEffect(() => writeBool("caretSmooth", caretSmooth), [caretSmooth]);
  useEffect(() => {
    try {
      localStorage.setItem("fontFamily", fontFamily);
    } catch {
      // ignore
    }
  }, [fontFamily]);
  useEffect(() => {
    try {
      localStorage.setItem("theme", theme);
    } catch {
      // ignore
    }
    const body = document.body;
    // remove any previous theme-* class then apply the current one.
    THEMES.forEach((t) => body.classList.remove(`theme-${t.id}`));
    body.classList.add(`theme-${theme}`);
  }, [theme]);
  // Persist custom colors + apply inline CSS vars when the custom theme is active.
  useEffect(() => {
    try {
      localStorage.setItem("customColors", JSON.stringify(customColors));
    } catch {
      // ignore
    }
  }, [customColors]);
  useEffect(() => {
    const body = document.body;
    const vars = [
      "--color-bg",
      "--color-sub",
      "--color-text",
      "--color-main",
      "--color-error",
    ] as const;
    if (theme === "custom" && isHex(customColors.bg) && isHex(customColors.accent)) {
      body.style.setProperty("--color-bg", hexToRgbTriplet(customColors.bg));
      body.style.setProperty("--color-sub", deriveSub(customColors.bg, customColors.accent));
      const accentRgb = hexToRgbTriplet(customColors.accent);
      body.style.setProperty("--color-text", accentRgb);
      body.style.setProperty("--color-main", accentRgb);
      body.style.setProperty("--color-error", "194 68 46");
    } else {
      vars.forEach((v) => body.style.removeProperty(v));
    }
  }, [theme, customColors]);
  useEffect(() => {
    try {
      localStorage.setItem("language", config.language);
    } catch {
      // ignore
    }
  }, [config.language]);

  useEffect(() => {
    document.body.classList.toggle("screen-mode", screenMode);
    return () => {
      document.body.classList.remove("screen-mode");
    };
  }, [screenMode]);

  const setMode = useCallback((mode: Mode) => {
    const amount = mode === "time" ? 30 : 25;
    setConfig((c) => ({ ...c, mode, amount }));
  }, []);
  const setAmount = useCallback((amount: number) => {
    setConfig((c) => ({ ...c, amount }));
  }, []);
  const setLanguage = useCallback((language: Language) => {
    setConfig((c) => ({ ...c, language }));
  }, []);

  return (
    <SettingsContext.Provider
      value={{
        config,
        setMode,
        setAmount,
        setLanguage,
        screenMode,
        setScreenMode,
        tape,
        setTape,
        showBongo,
        setShowBongo,
        bongoMoodMode,
        setBongoMoodMode,
        showKeyMap,
        setShowKeyMap,
        showCounter,
        setShowCounter,
        bilingual,
        setBilingual,
        bilingualPopout,
        setBilingualPopout,
        shadowLanguage,
        setShadowLanguage,
        hardMode,
        setHardMode,
        fontScale,
        setFontScale,
        fontWeight,
        setFontWeight,
        letterSpacing,
        setLetterSpacing,
        caretStyle,
        setCaretStyle,
        caretSmooth,
        setCaretSmooth,
        fontFamily,
        setFontFamily,
        theme,
        setTheme,
        customColors,
        setCustomColors,
        resetVersion,
        resetAppearance,
      }}
    >
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings(): SettingsCtx {
  const ctx = useContext(SettingsContext);
  if (!ctx)
    throw new Error("useSettings must be used inside SettingsProvider");
  return ctx;
}
