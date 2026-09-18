import englishData from "../data/english.json";
import english1kData from "../data/english_1k.json";
import indonesianData from "../data/indonesian.json";
import malayData from "../data/malay.json";

export type Language = "english" | "indonesian" | "malay";

const LISTS: Record<Language, string[]> = {
  english: (englishData as { words: string[] }).words,
  indonesian: (indonesianData as { words: string[] }).words,
  malay: (malayData as { words: string[] }).words,
};

export const LANGUAGES: Language[] = ["english", "indonesian", "malay"];

export function otherLanguage(lang: Language): Language {
  return lang === "english" ? "indonesian" : "english";
}

export function generateWords(count: number, language: Language): string[] {
  const src = LISTS[language];
  const out: string[] = [];
  let last = "";
  for (let i = 0; i < count; i++) {
    let w = src[Math.floor(Math.random() * src.length)]!;
    if (w === last) {
      w = src[Math.floor(Math.random() * src.length)]!;
    }
    last = w;
    out.push(w);
  }
  return out;
}

// Group each language's word list by length once so shadow lookups are O(1).
const BY_LENGTH: Record<Language, Map<number, string[]>> = {
  english: buildByLength(LISTS.english),
  indonesian: buildByLength(LISTS.indonesian),
  malay: buildByLength(LISTS.malay),
};

// Extra English fallback pool used only when the primary English dictionary
// lacks a word of a required length (e.g. long Indonesian words like
// "memerlukan"). Sourced from monkeytype's english_1k list.
const ENGLISH_1K_BY_LENGTH: Map<number, string[]> = buildByLength(
  (english1kData as { words: string[] }).words
);

function buildByLength(list: string[]): Map<number, string[]> {
  const map = new Map<number, string[]>();
  for (const w of list) {
    const arr = map.get(w.length);
    if (arr) arr.push(w);
    else map.set(w.length, [w]);
  }
  return map;
}

/**
 * Pick a shadow word of the same length from `shadowLang`. If the primary
 * dictionary has no word of that length and the shadow language is English,
 * fall back to monkeytype's english_1k list. Returns null only when every
 * pool for that length is empty.
 */
export function pickShadow(length: number, shadowLang: Language): string | null {
  const arr = BY_LENGTH[shadowLang].get(length);
  if (arr && arr.length > 0) {
    return arr[Math.floor(Math.random() * arr.length)]!;
  }
  if (shadowLang === "english") {
    const fallback = ENGLISH_1K_BY_LENGTH.get(length);
    if (fallback && fallback.length > 0) {
      return fallback[Math.floor(Math.random() * fallback.length)]!;
    }
  }
  return null;
}

export function generateShadows(
  words: string[],
  shadowLang: Language
): (string | null)[] {
  return words.map((w) => pickShadow(w.length, shadowLang));
}
