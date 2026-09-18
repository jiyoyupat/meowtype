import type { Mode } from "../types";
import type { Language } from "./words";

export type PbEntry = {
  wpm: number;
  acc: number;
  raw: number;
  at: string; // ISO date
};

type PbStore = Record<string, PbEntry>;

const STORAGE_KEY = "personalBests";

export function pbKey(mode: Mode, amount: number, language: Language): string {
  return `${mode}-${amount}-${language}`;
}

function readStore(): PbStore {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === "object") return parsed as PbStore;
    return {};
  } catch {
    return {};
  }
}

function writeStore(store: PbStore): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  } catch {
    // ignore
  }
}

export function getPb(
  mode: Mode,
  amount: number,
  language: Language
): PbEntry | null {
  const store = readStore();
  return store[pbKey(mode, amount, language)] ?? null;
}

/**
 * Attempts to record a new personal best. Returns the previous PB (or null)
 * and whether the incoming entry beat it.
 */
export function recordPb(
  mode: Mode,
  amount: number,
  language: Language,
  entry: Omit<PbEntry, "at">
): { previous: PbEntry | null; isNewPb: boolean } {
  const store = readStore();
  const key = pbKey(mode, amount, language);
  const previous = store[key] ?? null;
  const isNewPb = !previous || entry.wpm > previous.wpm;
  if (isNewPb) {
    store[key] = { ...entry, at: new Date().toISOString() };
    writeStore(store);
  }
  return { previous, isNewPb };
}
